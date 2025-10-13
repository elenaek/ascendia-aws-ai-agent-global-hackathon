#!/usr/bin/env python3
"""
Bedrock Model Access Checker
=============================
Checks if required AWS Bedrock foundation models have access granted.
This is necessary because model access can only be requested through the
AWS Console, not programmatically.

Usage:
    python scripts/check-bedrock-models.py [--region REGION] [--required-only]

Exit Codes:
    0 - All required models have access
    1 - Missing access to required models
    2 - Error checking model access (e.g., AWS credentials issue)
"""

import sys
import argparse
from typing import List, Dict, Set
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError
except ImportError:
    print("Error: boto3 not installed")
    print("Install with: pip install boto3")
    sys.exit(2)

# ANSI color codes
class Colors:
    BLUE = '\033[0;34m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    RED = '\033[0;31m'
    CYAN = '\033[0;36m'
    NC = '\033[0m'  # No Color


def print_header(msg: str):
    print(f"\n{Colors.CYAN}{'='*60}{Colors.NC}")
    print(f"{Colors.CYAN}{msg}{Colors.NC}")
    print(f"{Colors.CYAN}{'='*60}{Colors.NC}")


def print_success(msg: str):
    print(f"{Colors.GREEN}✓{Colors.NC} {msg}")


def print_warning(msg: str):
    print(f"{Colors.YELLOW}⚠{Colors.NC} {msg}")


def print_error(msg: str):
    print(f"{Colors.RED}✗{Colors.NC} {msg}")


def print_info(msg: str):
    print(f"  {msg}")


# Models used by this application
REQUIRED_MODELS = {
    "us.amazon.nova-pro-v1:0": "Amazon Nova Pro",
}

OPTIONAL_MODELS = {
    "us.amazon.nova-premier-v1:0": "Amazon Nova Premier",
}


def get_accessible_models(region: str) -> Set[str]:
    """
    Get list of foundation models that are currently accessible.
    Returns a set of model IDs.
    """
    try:
        bedrock_client = boto3.client('bedrock', region_name=region)

        # List all foundation models
        response = bedrock_client.list_foundation_models()

        # Filter to only models we have access to
        # Models without inference types listed are not accessible
        accessible_models = set()

        for model in response.get('modelSummaries', []):
            model_id = model.get('modelId')
            # Check if model supports inference (indicates access is granted)
            inference_types = model.get('inferenceTypesSupported', [])

            if inference_types and model_id:
                accessible_models.add(model_id)

        return accessible_models

    except NoCredentialsError:
        print_error("AWS credentials not configured")
        print_info("Configure with: aws configure")
        sys.exit(2)
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        print_error(f"AWS API error: {error_code}")
        print_info(f"Details: {str(e)}")
        sys.exit(2)
    except Exception as e:
        print_error(f"Failed to check model access: {str(e)}")
        sys.exit(2)


def check_model_access(region: str, check_optional: bool = True) -> bool:
    """
    Check if required (and optionally, optional) models have access.
    Returns True if all required models have access.
    """
    print_header("Bedrock Model Access Check")
    print_info(f"Region: {region}")
    print()

    # Get accessible models
    print_info("Checking foundation model access...")
    accessible_models = get_accessible_models(region)

    print_info(f"Found {len(accessible_models)} accessible models")
    print()

    # Check required models
    print(f"{Colors.BLUE}Required Models:{Colors.NC}")
    missing_required = []

    for model_id, model_name in REQUIRED_MODELS.items():
        if model_id in accessible_models:
            print_success(f"{model_name} ({model_id})")
        else:
            print_error(f"{model_name} ({model_id}) - Access not granted")
            missing_required.append((model_id, model_name))

    print()

    # Check optional models
    if check_optional:
        print(f"{Colors.BLUE}Optional Models:{Colors.NC}")
        missing_optional = []

        for model_id, model_name in OPTIONAL_MODELS.items():
            if model_id in accessible_models:
                print_success(f"{model_name} ({model_id})")
            else:
                print_warning(f"{model_name} ({model_id}) - Access not granted")
                missing_optional.append((model_id, model_name))

        print()

    # Summary and instructions
    if missing_required:
        print_header("Action Required")
        print_error("Missing access to required models!")
        print()
        print_info("You must enable model access through the AWS Console:")
        print()
        print(f"  {Colors.CYAN}1.{Colors.NC} Open the Bedrock console:")
        print(f"     {Colors.BLUE}https://console.aws.amazon.com/bedrock/{Colors.NC}")
        print()
        print(f"  {Colors.CYAN}2.{Colors.NC} Navigate to: Bedrock configurations > Model access")
        print()
        print(f"  {Colors.CYAN}3.{Colors.NC} Click 'Modify model access'")
        print()
        print(f"  {Colors.CYAN}4.{Colors.NC} Enable these models:")
        for model_id, model_name in missing_required:
            print(f"     • {model_name} ({model_id})")
        print()
        print(f"  {Colors.CYAN}5.{Colors.NC} Review and submit the request")
        print()
        print(f"  {Colors.CYAN}Note:{Colors.NC} Access is usually granted immediately for Amazon models")
        print(f"        Changes can take a few minutes to propagate")
        print()
        print(f"  {Colors.CYAN}Direct link:{Colors.NC} https://console.aws.amazon.com/bedrock/home?region={region}#/modelaccess")
        print()

        return False
    else:
        print_header("Success")
        print_success("All required models are accessible!")
        print()
        return True


def main():
    parser = argparse.ArgumentParser(
        description='Check AWS Bedrock foundation model access',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        '--region',
        default='us-east-1',
        help='AWS region to check (default: us-east-1)'
    )
    parser.add_argument(
        '--required-only',
        action='store_true',
        help='Only check required models, skip optional models'
    )

    args = parser.parse_args()

    # Check model access
    success = check_model_access(
        region=args.region,
        check_optional=not args.required_only
    )

    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
