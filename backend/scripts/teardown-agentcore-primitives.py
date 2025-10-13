#!/usr/bin/env python3
"""
AgentCore Primitives Teardown Script
=====================================
Deletes AWS Bedrock AgentCore primitives using boto3:
- API Key Credential Provider
- Workload Identity
- Memory

This script uses boto3 instead of AWS CLI for better reliability,
error handling, and consistency with the deployment script.

Usage:
    python backend/scripts/teardown-agentcore-primitives.py [OPTIONS]

Options:
    --agent-name TEXT           Agent name (default: business_analyst)
    --memory-name TEXT          Memory name (default: business_analyst_memory)
    --memory-id TEXT            Explicit memory ID to delete
    --region TEXT               AWS region (default: from env or us-east-1)
    --dry-run                   Show what would be deleted without deleting
    --skip-api-key              Skip API key credential provider deletion
    --skip-identity             Skip workload identity deletion
    --skip-memory               Skip memory deletion
    --force                     Suppress confirmation prompts

Environment Variables:
    AWS_REGION - AWS region for deletion (default: us-east-1)
    AGENT_NAME - Default agent name
    MEMORY_NAME - Default memory name
"""

import os
import sys
import argparse
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=Path(__file__).parent.parent / '.env')

try:
    import boto3
    from botocore.exceptions import ClientError
    from bedrock_agentcore_starter_toolkit.operations.memory.manager import MemoryManager
except ImportError as e:
    print(f"❌ Error: Required package not found: {e}")
    print("Install with: pip install bedrock-agentcore-starter-toolkit boto3")
    sys.exit(1)

# ANSI color codes
class Colors:
    BLUE = '\033[0;34m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    RED = '\033[0;31m'
    CYAN = '\033[0;36m'
    MAGENTA = '\033[0;35m'
    NC = '\033[0m'  # No Color

def safe_print(text: str):
    """Print text, handling Unicode encoding errors for Windows console"""
    try:
        print(text)
    except UnicodeEncodeError:
        try:
            print(text.encode('ascii', errors='replace').decode('ascii'))
        except:
            print("[Output contains characters that cannot be displayed]")

def print_step(msg: str):
    safe_print(f"\n{Colors.BLUE}▶ {msg}{Colors.NC}")

def print_success(msg: str):
    safe_print(f"{Colors.GREEN}✓ {msg}{Colors.NC}")

def print_warning(msg: str):
    safe_print(f"{Colors.YELLOW}⚠ {msg}{Colors.NC}")

def print_error(msg: str):
    safe_print(f"{Colors.RED}✗ {msg}{Colors.NC}")

def print_info(msg: str):
    safe_print(f"  {msg}")

def print_dry_run(msg: str):
    safe_print(f"{Colors.MAGENTA}[DRY RUN]{Colors.NC} Would delete: {msg}")


class AgentCoreTeardown:
    """Handles deletion of AgentCore primitives"""

    def __init__(
        self,
        agent_name: str,
        memory_name: str,
        region: str,
        memory_id: Optional[str] = None,
        dry_run: bool = False
    ):
        self.agent_name = agent_name
        self.memory_name = memory_name
        self.region = region
        self.memory_id = memory_id
        self.dry_run = dry_run

        # Derive API key provider name (matches deploy script)
        self.api_key_provider_name = f"{agent_name}_tavily_api_key"

        # Initialize AWS clients
        self.identity_client = boto3.client('bedrock-agentcore-control', region_name=region)
        self.memory_manager = MemoryManager(region_name=region)

        # Track errors
        self.errors = []

    def delete_api_key_credential_provider(self) -> bool:
        """Delete API key credential provider"""
        print_step(f"Deleting API Key Credential Provider: {self.api_key_provider_name}")

        if self.dry_run:
            print_dry_run(f"API key credential provider '{self.api_key_provider_name}'")
            return True

        try:
            self.identity_client.delete_api_key_credential_provider(
                name=self.api_key_provider_name
            )
            print_success(f"API key credential provider deleted")
            return True

        except ClientError as e:
            error_code = e.response['Error']['Code']

            if error_code == 'ResourceNotFoundException':
                print_warning("API key credential provider not found (may already be deleted)")
                return True
            elif error_code == 'AccessDeniedException':
                print_error(f"Permission denied: {e.response['Error']['Message']}")
                self.errors.append(f"API key deletion: {error_code}")
                return False
            else:
                print_error(f"Failed to delete API key: {e.response['Error']['Message']}")
                self.errors.append(f"API key deletion: {error_code}")
                return False

        except Exception as e:
            print_error(f"Unexpected error deleting API key: {str(e)}")
            self.errors.append(f"API key deletion: {str(e)}")
            return False

    def delete_workload_identity(self) -> bool:
        """Delete workload identity"""
        print_step(f"Deleting Workload Identity: {self.agent_name}")

        if self.dry_run:
            print_dry_run(f"Workload identity '{self.agent_name}'")
            return True

        try:
            self.identity_client.delete_workload_identity(
                name=self.agent_name
            )
            print_success(f"Workload identity deleted")
            return True

        except ClientError as e:
            error_code = e.response['Error']['Code']

            if error_code == 'ResourceNotFoundException':
                print_warning("Workload identity not found (may already be deleted)")
                return True
            elif error_code == 'AccessDeniedException':
                print_error(f"Permission denied: {e.response['Error']['Message']}")
                self.errors.append(f"Identity deletion: {error_code}")
                return False
            else:
                print_error(f"Failed to delete workload identity: {e.response['Error']['Message']}")
                self.errors.append(f"Identity deletion: {error_code}")
                return False

        except Exception as e:
            print_error(f"Unexpected error deleting workload identity: {str(e)}")
            self.errors.append(f"Identity deletion: {str(e)}")
            return False

    def delete_memory(self) -> bool:
        """Delete AgentCore memory"""
        print_step(f"Deleting AgentCore Memory: {self.memory_name}")

        if self.dry_run:
            print_dry_run(f"Memory '{self.memory_name}' (ID: {self.memory_id or 'will lookup'})")
            return True

        try:
            # If memory_id is provided, use it directly
            if self.memory_id:
                print_info(f"Using provided memory ID: {self.memory_id}")
                memory_to_delete = self.memory_id
            else:
                # Look up memory by name
                print_info(f"Looking up memory by name: {self.memory_name}")

                existing_memories_response = self.memory_manager.list_memories()

                # Handle both list and dict response formats
                if isinstance(existing_memories_response, dict):
                    existing_memories = existing_memories_response.get('memories', [])
                else:
                    existing_memories = existing_memories_response

                # Find memory by name
                memory_to_delete = None
                for memory in existing_memories:
                    if memory.get('name') == self.memory_name:
                        memory_to_delete = memory.get('id')
                        print_info(f"Found memory ID: {memory_to_delete}")
                        break

                if not memory_to_delete:
                    print_warning(f"Memory '{self.memory_name}' not found (may already be deleted)")
                    return True

            # Delete the memory
            self.memory_manager.delete_memory(memory_id=memory_to_delete)
            print_success(f"Memory deleted")
            return True

        except ClientError as e:
            error_code = e.response['Error']['Code']

            if error_code == 'ResourceNotFoundException':
                print_warning("Memory not found (may already be deleted)")
                return True
            elif error_code == 'AccessDeniedException':
                print_error(f"Permission denied: {e.response['Error']['Message']}")
                self.errors.append(f"Memory deletion: {error_code}")
                return False
            else:
                print_error(f"Failed to delete memory: {e.response['Error']['Message']}")
                self.errors.append(f"Memory deletion: {error_code}")
                return False

        except Exception as e:
            print_error(f"Unexpected error deleting memory: {str(e)}")
            self.errors.append(f"Memory deletion: {str(e)}")
            return False

    def teardown_all(
        self,
        skip_api_key: bool = False,
        skip_identity: bool = False,
        skip_memory: bool = False
    ) -> bool:
        """Delete all AgentCore primitives"""

        print_info(f"Region: {self.region}")
        print_info(f"Agent: {self.agent_name}")
        print_info(f"Memory: {self.memory_name}")
        if self.dry_run:
            print_warning("DRY RUN MODE - No resources will be deleted")
        print()

        success = True

        # Delete API key credential provider
        if not skip_api_key:
            if not self.delete_api_key_credential_provider():
                success = False
        else:
            print_warning("Skipping API key credential provider deletion")

        # Delete workload identity
        if not skip_identity:
            if not self.delete_workload_identity():
                success = False
        else:
            print_warning("Skipping workload identity deletion")

        # Delete memory
        if not skip_memory:
            if not self.delete_memory():
                success = False
        else:
            print_warning("Skipping memory deletion")

        # Summary
        print()
        if self.dry_run:
            print_success("DRY RUN complete - no resources were deleted")
        elif success and not self.errors:
            print_success("All AgentCore primitives deleted successfully")
        elif self.errors:
            print_warning(f"Completed with {len(self.errors)} error(s)")
            print_info("Errors:")
            for error in self.errors:
                print_info(f"  • {error}")
            return False

        return success


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Delete AWS Bedrock AgentCore primitives using boto3'
    )
    parser.add_argument(
        '--agent-name',
        default=os.getenv('AGENT_NAME', 'business_analyst'),
        help='Agent name (default: business_analyst)'
    )
    parser.add_argument(
        '--memory-name',
        default=os.getenv('MEMORY_NAME', 'business_analyst_memory'),
        help='Memory name (default: business_analyst_memory)'
    )
    parser.add_argument(
        '--memory-id',
        help='Explicit memory ID to delete'
    )
    parser.add_argument(
        '--region',
        default=os.getenv('AWS_REGION', 'us-east-1'),
        help='AWS region (default: us-east-1)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be deleted without deleting'
    )
    parser.add_argument(
        '--skip-api-key',
        action='store_true',
        help='Skip API key credential provider deletion'
    )
    parser.add_argument(
        '--skip-identity',
        action='store_true',
        help='Skip workload identity deletion'
    )
    parser.add_argument(
        '--skip-memory',
        action='store_true',
        help='Skip memory deletion'
    )

    args = parser.parse_args()

    # Create teardown instance
    teardown = AgentCoreTeardown(
        agent_name=args.agent_name,
        memory_name=args.memory_name,
        region=args.region,
        memory_id=args.memory_id,
        dry_run=args.dry_run
    )

    # Execute teardown
    success = teardown.teardown_all(
        skip_api_key=args.skip_api_key,
        skip_identity=args.skip_identity,
        skip_memory=args.skip_memory
    )

    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
