#!/usr/bin/env python3
"""
IAM Policy Attachment Script
=============================
Attaches the CDK-created IAM policy to the AgentCore execution role.

This script:
1. Reads the AgentCore execution role ARN from .bedrock_agentcore.yaml
2. Gets the IAM policy ARN from CDK stack outputs
3. Attaches the policy to the execution role (if not already attached)

Usage:
    python backend/scripts/attach-iam-policy.py [--stack-name STACK_NAME]

Environment Variables:
    AWS_REGION - AWS region (defaults to us-east-1)
    CDK_STACK_NAME - CloudFormation stack name (defaults to InfrastructureStack)
"""

import os
import sys
import argparse
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

try:
    import boto3
    import yaml
except ImportError as e:
    print(f"❌ Error: Required package not found: {e}")
    print("Install with: pip install boto3 pyyaml")
    sys.exit(1)

# ANSI color codes
class Colors:
    BLUE = '\033[0;34m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    RED = '\033[0;31m'
    NC = '\033[0m'  # No Color

def print_step(msg: str):
    print(f"\n{Colors.BLUE}{'='*60}{Colors.NC}")
    print(f"{Colors.BLUE}{msg}{Colors.NC}")
    print(f"{Colors.BLUE}{'='*60}{Colors.NC}")

def print_success(msg: str):
    print(f"{Colors.GREEN}✓{Colors.NC} {msg}")

def print_warning(msg: str):
    print(f"{Colors.YELLOW}⚠{Colors.NC} {msg}")

def print_error(msg: str):
    print(f"{Colors.RED}✗{Colors.NC} {msg}")

def print_info(msg: str):
    print(f"  {msg}")


class IAMPolicyAttacher:
    """Handles attaching CDK IAM policy to AgentCore execution role"""

    def __init__(self, stack_name: str):
        self.aws_region = os.getenv('AWS_REGION', 'us-east-1')
        self.stack_name = stack_name

        # Initialize AWS clients
        self.cfn_client = boto3.client('cloudformation', region_name=self.aws_region)
        self.iam_client = boto3.client('iam', region_name=self.aws_region)

    def get_agentcore_execution_role(self) -> Optional[str]:
        """
        Get the AgentCore execution role ARN from .bedrock_agentcore.yaml
        Returns: Execution role ARN or None
        """
        print_step("Step 1: Getting AgentCore Execution Role")

        backend_dir = Path(__file__).parent.parent
        config_file = backend_dir / ".bedrock_agentcore.yaml"

        if not config_file.exists():
            print_error(f"AgentCore configuration not found: {config_file}")
            print_info("Please deploy the agent first using: python backend/scripts/deploy-agentcore.py")
            return None

        try:
            with open(config_file, 'r') as f:
                config = yaml.safe_load(f)

            # Navigate to the execution role
            agents = config.get('agents', {})
            for agent_name, agent_config in agents.items():
                execution_role_arn = agent_config.get('aws', {}).get('execution_role')
                if execution_role_arn:
                    print_success(f"Found execution role: {execution_role_arn}")
                    return execution_role_arn

            print_error("No execution role found in configuration")
            return None

        except Exception as e:
            print_error(f"Failed to read AgentCore configuration: {str(e)}")
            return None

    def get_cdk_policy_arn(self) -> Optional[str]:
        """
        Get the IAM policy ARN from CDK stack outputs
        Returns: Policy ARN or None
        """
        print_step("Step 2: Getting CDK IAM Policy ARN")

        try:
            response = self.cfn_client.describe_stacks(StackName=self.stack_name)

            if not response['Stacks']:
                print_error(f"Stack '{self.stack_name}' not found")
                print_info("Please deploy the CDK stack first")
                return None

            stack = response['Stacks'][0]
            outputs = {o['OutputKey']: o['OutputValue'] for o in stack.get('Outputs', [])}

            # Look for the policy ARN output
            policy_arn = outputs.get('AgentCoreSecretsPolicyArn')

            if policy_arn:
                print_success(f"Found policy ARN: {policy_arn}")
                return policy_arn
            else:
                print_error("Policy ARN not found in stack outputs")
                print_info("Expected output key: AgentCoreSecretsPolicyArn")
                return None

        except Exception as e:
            print_error(f"Failed to get CDK stack outputs: {str(e)}")
            return None

    def attach_policy(self, role_arn: str, policy_arn: str) -> bool:
        """
        Attach the policy to the role
        Returns: True if successful, False otherwise
        """
        print_step("Step 3: Attaching IAM Policy to Execution Role")

        try:
            # Extract role name from ARN
            role_name = role_arn.split('/')[-1]
            print_info(f"Role name: {role_name}")

            # Check if policy is already attached
            response = self.iam_client.list_attached_role_policies(RoleName=role_name)
            attached_policies = response.get('AttachedPolicies', [])

            if any(p['PolicyArn'] == policy_arn for p in attached_policies):
                print_warning("Policy is already attached to the role")
                return True

            # Attach the policy
            print_info("Attaching policy...")
            self.iam_client.attach_role_policy(
                RoleName=role_name,
                PolicyArn=policy_arn
            )

            print_success("Policy attached successfully!")
            return True

        except Exception as e:
            print_error(f"Failed to attach policy: {str(e)}")
            return False

    def run(self) -> bool:
        """
        Main execution flow
        Returns: True if successful, False otherwise
        """
        print_step("IAM Policy Attachment")
        print_info(f"Region: {self.aws_region}")
        print_info(f"Stack: {self.stack_name}")

        # Get execution role
        execution_role_arn = self.get_agentcore_execution_role()
        if not execution_role_arn:
            return False

        # Get policy ARN
        policy_arn = self.get_cdk_policy_arn()
        if not policy_arn:
            return False

        # Attach policy
        success = self.attach_policy(execution_role_arn, policy_arn)

        if success:
            print_step("Summary")
            print_success("IAM policy successfully attached to AgentCore execution role")
            print_info("The agent now has permissions to:")
            print_info("  - Access AgentCore Memory (conversation history)")
            print_info("  - Access AgentCore Identity (API key credential providers)")
            print_info("  - Read/write to DynamoDB tables")
            print_info("  - Send messages to WebSocket API")
        else:
            print_error("Failed to attach IAM policy")

        return success


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Attach CDK IAM policy to AgentCore execution role')
    parser.add_argument(
        '--stack-name',
        default=os.getenv('CDK_STACK_NAME', 'InfrastructureStack'),
        help='CloudFormation stack name (default: InfrastructureStack)'
    )

    args = parser.parse_args()

    attacher = IAMPolicyAttacher(stack_name=args.stack_name)
    success = attacher.run()

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
