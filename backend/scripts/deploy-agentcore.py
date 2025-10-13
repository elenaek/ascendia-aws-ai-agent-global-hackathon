#!/usr/bin/env python3
"""
AgentCore Deployment Script
============================
Programmatically deploys AWS Bedrock AgentCore primitives:
- Memory (with semantic strategy)
- Identity (workload identity with API keys)
- Agent (using agentcore CLI - idempotent)

Usage:
    python backend/scripts/deploy-agentcore.py [--skip-memory] [--skip-identity] [--skip-agent]

Environment Variables:
    This script loads variables from TWO .env files in order:
    1. Root .env (pre-deployment): AWS_ACCOUNT_ID, TAVILY_API_KEY, AWS_REGION
    2. backend/.env (post-deployment): COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID,
       WEBSOCKET_API_ID (these override root .env if present)

    Required (Pre-Deployment):
        AWS_REGION - AWS region for deployment
        AWS_ACCOUNT_ID - AWS account ID
        TAVILY_API_KEY - Tavily API key to store in identity

    Required (Post-CDK Deployment):
        COGNITO_USER_POOL_ID - Cognito User Pool ID for agent authorization
        COGNITO_CLIENT_ID - Cognito Client ID for agent authorization
        WEBSOCKET_API_ID - WebSocket API Gateway ID for UI updates

    Optional:
        MEMORY_NAME - Name for AgentCore memory resource (default: business_analyst_memory)
        MAX_RECENT_TURNS - Number of recent conversation turns to keep (default: 10)

Note: If using deploy-all.sh, CDK outputs are automatically populated in backend/.env
      before this script runs, so all variables will be available.
"""

import os
import sys
import json
import subprocess
import argparse
from pathlib import Path
from typing import Dict, Optional, Any
from dotenv import load_dotenv

# Load environment variables
# Load root .env first (pre-deployment vars: AWS_ACCOUNT_ID, TAVILY_API_KEY)
load_dotenv(dotenv_path=Path(__file__).parent.parent.parent / '.env')
# Load backend/.env second (post-deployment vars from CDK: COGNITO_*, WEBSOCKET_API_ID)
load_dotenv(dotenv_path=Path(__file__).parent.parent / '.env', override=True)

try:
    import boto3
    from bedrock_agentcore_starter_toolkit.operations.memory.manager import MemoryManager
    from bedrock_agentcore_starter_toolkit.operations.memory.models.strategies import SemanticStrategy, SummaryStrategy
except ImportError as e:
    print(f"❌ Error: Required package not found: {e}")
    print("Install with: pip install bedrock-agentcore bedrock-agentcore-starter-toolkit boto3")
    sys.exit(1)

# ANSI color codes
class Colors:
    BLUE = '\033[0;34m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    RED = '\033[0;31m'
    NC = '\033[0m'  # No Color

def safe_print(text: str):
    """Print text, handling Unicode encoding errors for Windows console"""
    try:
        print(text)
    except UnicodeEncodeError:
        # If printing fails, encode to ASCII with replacement
        try:
            print(text.encode('ascii', errors='replace').decode('ascii'))
        except:
            print("[Output contains characters that cannot be displayed]")

def print_step(msg: str):
    safe_print(f"\n{Colors.BLUE}{'='*60}{Colors.NC}")
    safe_print(f"{Colors.BLUE}{msg}{Colors.NC}")
    safe_print(f"{Colors.BLUE}{'='*60}{Colors.NC}")

def print_success(msg: str):
    safe_print(f"{Colors.GREEN}[OK]{Colors.NC} {msg}")

def print_warning(msg: str):
    safe_print(f"{Colors.YELLOW}[WARN]{Colors.NC} {msg}")

def print_error(msg: str):
    safe_print(f"{Colors.RED}[ERROR]{Colors.NC} {msg}")

def print_info(msg: str):
    safe_print(f"  {msg}")

def sanitize_output(text: str) -> str:
    """Remove or replace characters that can't be encoded in Windows console"""
    if not text:
        return text
    try:
        # Try to encode with console encoding, replace unsupported chars
        return text.encode('cp1252', errors='replace').decode('cp1252')
    except:
        # Fallback: remove non-ASCII characters
        return ''.join(char if ord(char) < 128 else '?' for char in text)


class AgentCoreDeployer:
    """Handles deployment of AgentCore primitives"""

    def __init__(self):
        # Get environment variables
        self.aws_region = os.getenv('AWS_REGION', 'us-east-1')
        self.aws_account_id = os.getenv('AWS_ACCOUNT_ID')
        self.memory_name = os.getenv('MEMORY_NAME', 'business_analyst_memory')
        self.tavily_api_key = os.getenv('TAVILY_API_KEY')
        self.cognito_user_pool_id = os.getenv('COGNITO_USER_POOL_ID')
        self.cognito_client_id = os.getenv('COGNITO_CLIENT_ID')
        self.websocket_api_id = os.getenv('WEBSOCKET_API_ID')

        # Agent configuration
        self.agent_name = "business_analyst"
        self.agent_entrypoint = "main.py"

        # Credential provider name (matches what deploy_identity creates)
        self.api_key_provider_name = f"{self.agent_name}_tavily_api_key"

        # Validate required variables
        self._validate_environment()

        # Initialize AWS clients
        self.memory_manager = MemoryManager(region_name=self.aws_region)
        # Use boto3 bedrock-agentcore-control client for identity management
        self.identity_client = boto3.client('bedrock-agentcore-control', region_name=self.aws_region)

    def _validate_environment(self):
        """Validate required environment variables"""
        required_vars = {
            'AWS_ACCOUNT_ID': self.aws_account_id,
            'TAVILY_API_KEY': self.tavily_api_key,
        }

        missing_vars = [var for var, value in required_vars.items() if not value]

        if missing_vars:
            print_error(f"Missing required environment variables: {', '.join(missing_vars)}")
            print_info("Please set these in your .env file")
            sys.exit(1)

    def deploy_memory(self) -> Dict[str, Any]:
        """
        Deploy or get existing AgentCore Memory
        Returns: Memory resource metadata
        """
        print_step("Step 1: Deploying AgentCore Memory")

        try:
            # Check if memory already exists
            print_info(f"Checking for existing memory: {self.memory_name}")

            # List existing memories
            existing_memories_response = self.memory_manager.list_memories()

            # Handle both list and dict response formats
            if isinstance(existing_memories_response, dict):
                existing_memories = existing_memories_response.get('memories', [])
            else:
                existing_memories = existing_memories_response

            memory_exists = any(m.get('name') == self.memory_name for m in existing_memories)

            if memory_exists:
                print_warning(f"Memory '{self.memory_name}' already exists")
                # Get existing memory details
                for memory in existing_memories:
                    if memory.get('name') == self.memory_name:
                        memory_resource = memory
                        break
            else:
                print_info(f"Creating new memory: {self.memory_name}")
                # Create new memory with semantic strategy
                memory_resource = self.memory_manager.get_or_create_memory(
                    name=self.memory_name,
                    description="Memory store for business analyst agent - stores conversation history and extracted competitive insights",
                    event_expiry_days=7,
                    strategies=[
                        SummaryStrategy(
                            name="summaryStrategy",
                            namespaces=['/strategies/{memoryStrategyId}/actors/{actorId}/sessions/{sessionId}']
                        ),
                        SemanticStrategy(
                            name="semanticLongTermMemory",
                            # Actor-based namespace ensures memory isolation per user
                            namespaces=['/strategies/{memoryStrategyId}/actors/{actorId}']
                        )
                    ]
                )

            memory_id = memory_resource.get('id')
            memory_arn = memory_resource.get('arn')

            print_success(f"Memory ready: {memory_id}")
            print_info(f"ARN: {memory_arn}")

            return memory_resource

        except Exception as e:
            print_error(f"Failed to deploy memory: {str(e)}")
            raise

    def deploy_identity(self) -> Dict[str, Any]:
        """
        Deploy or get existing AgentCore Identity (workload identity) and API key credential provider
        Returns: Identity resource metadata
        """
        print_step("Step 2: Deploying AgentCore Identity")

        try:
            # Step 1: Create or get workload identity
            print_info(f"Checking for existing workload identity: {self.agent_name}")

            identity_response = None
            identity_arn = None

            try:
                # Try to get existing workload identity
                identity_response = self.identity_client.get_workload_identity(name=self.agent_name)
                identity_arn = identity_response.get('workloadIdentityArn')
                print_warning(f"Workload identity '{self.agent_name}' already exists")
            except self.identity_client.exceptions.ResourceNotFoundException:
                # Identity doesn't exist, create it
                print_info(f"Creating new workload identity: {self.agent_name}")
                identity_response = self.identity_client.create_workload_identity(name=self.agent_name)
                identity_arn = identity_response.get('workloadIdentityArn')
                print_success(f"Workload identity created")

            print_success(f"Identity ready: {identity_arn}")

            # Step 2: Create or update API key credential provider
            print_info(f"Setting up API key credential provider: {self.api_key_provider_name}")

            try:
                # Try to create new credential provider
                provider_response = self.identity_client.create_api_key_credential_provider(
                    name=self.api_key_provider_name,
                    apiKey=self.tavily_api_key
                )
                print_success(f"API key credential provider created: {provider_response.get('credentialProviderArn')}")
            except (self.identity_client.exceptions.ConflictException,
                    self.identity_client.exceptions.ValidationException) as e:
                # Provider already exists, update it
                if "already exists" in str(e):
                    print_warning(f"API key credential provider '{self.api_key_provider_name}' already exists, updating...")
                    provider_response = self.identity_client.update_api_key_credential_provider(
                        name=self.api_key_provider_name,
                        apiKey=self.tavily_api_key
                    )
                    print_success(f"API key credential provider updated")
                else:
                    # Re-raise if it's a different validation error
                    raise

            return identity_response

        except Exception as e:
            print_error(f"Failed to deploy identity: {str(e)}")
            raise

    def deploy_agent(self) -> Dict[str, Any]:
        """
        Deploy agent using agentcore CLI (idempotent)
        Returns: Agent deployment information
        """
        print_step("Step 3: Deploying AgentCore Agent")

        try:
            # Change to backend directory
            backend_dir = Path(__file__).parent.parent
            os.chdir(backend_dir)

            print_info(f"Working directory: {os.getcwd()}")

            # Check if agent is already configured and deployed
            config_file = Path(".bedrock_agentcore.yaml")
            agent_already_deployed = False

            if config_file.exists():
                print_warning("Agent configuration already exists")
                print_info("Using existing configuration from .bedrock_agentcore.yaml")

                # Check if agent is actually deployed by reading the config
                try:
                    import yaml
                    with open(config_file, 'r') as f:
                        config = yaml.safe_load(f)

                    agent_arn = config.get('agents', {}).get(self.agent_name, {}).get('bedrock_agentcore', {}).get('agent_arn')
                    if agent_arn:
                        print_success(f"Agent already deployed: {agent_arn}")
                        print_info("Skipping deployment - agent is already active")
                        agent_already_deployed = True

                        return {
                            'agent_arn': agent_arn,
                            'agent_id': config.get('agents', {}).get(self.agent_name, {}).get('bedrock_agentcore', {}).get('agent_id'),
                            'agent_name': self.agent_name,
                            'status': 'already_deployed'
                        }
                except Exception as e:
                    print_warning(f"Could not read existing config: {str(e)}")
                    print_info("Will attempt to redeploy...")

            if not agent_already_deployed and not config_file.exists():
                # Validate Cognito variables are available for configuration
                if not self.cognito_user_pool_id or not self.cognito_client_id:
                    print_error("Cannot configure agent: Missing Cognito configuration")
                    print_info("COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID are required for JWT authentication")
                    print_info("These are automatically populated by deploy-all.sh after CDK deployment")
                    raise Exception("Missing required Cognito configuration for agent setup")

                print_info("Configuring agent...")

                # Build Cognito discovery URL
                cognito_discovery_url = f"https://cognito-idp.{self.aws_region}.amazonaws.com/{self.cognito_user_pool_id}/.well-known/openid-configuration"

                # Build authorizer config JSON
                authorizer_config = json.dumps({
                    "customJWTAuthorizer": {
                        "discoveryUrl": cognito_discovery_url,
                        "allowedClients": [self.cognito_client_id]
                    }
                })

                # Run agentcore configure
                configure_cmd = [
                    "agentcore", "configure",
                    "-e", self.agent_entrypoint,
                    "--name", self.agent_name,
                    "--region", self.aws_region,
                    "--authorizer-config", authorizer_config,
                    "--ecr", "auto",
                    "--request-header-allowlist", "Authorization",
                    "--non-interactive"
                ]

                # Set environment variables for cleaner output
                env = os.environ.copy()
                env['PYTHONIOENCODING'] = 'utf-8'  # Force UTF-8 encoding

                # Capture output for better error reporting
                result = subprocess.run(configure_cmd, text=True, encoding='utf-8', env=env, capture_output=True)

                # Print stdout if available
                if result.stdout:
                    print(sanitize_output(result.stdout))

                if result.returncode != 0:
                    print_error(f"Configuration failed with exit code {result.returncode}")
                    if result.stderr:
                        print_error(f"Error details: {sanitize_output(result.stderr)}")
                    raise Exception("Agent configuration failed")

                print_success("Agent configured successfully")

            # Skip launch if agent is already deployed (handled above with early return)
            # This code only runs if agent needs to be deployed/updated

            # Validate post-deployment variables before launch
            post_deploy_vars = {
                'COGNITO_USER_POOL_ID': self.cognito_user_pool_id,
                'COGNITO_CLIENT_ID': self.cognito_client_id,
                'WEBSOCKET_API_ID': self.websocket_api_id,
            }
            missing_post_deploy = [var for var, value in post_deploy_vars.items() if not value]

            if missing_post_deploy:
                print_warning(f"Post-deployment variables not set: {', '.join(missing_post_deploy)}")
                print_info("Agent will deploy but Cognito authorization and WebSocket features won't work")
                print_info("These are automatically populated by deploy-all.sh after CDK deployment")

            # Deploy agent using agentcore launch
            print_info("Launching agent to AgentCore Runtime...")

            # Build environment variables for agent
            env_vars = [
                f"COGNITO_USER_POOL_ID={self.cognito_user_pool_id}",
                f"COGNITO_IDENTITY_POOL_ID={os.getenv('COGNITO_IDENTITY_POOL_ID', '')}",
                f"AWS_REGION={self.aws_region}",
                f"AWS_ACCOUNT_ID={self.aws_account_id}",
                f"WEBSOCKET_API_ID={self.websocket_api_id}",
                f"MEMORY_NAME={self.memory_name}",
                f"MAX_RECENT_TURNS={os.getenv('MAX_RECENT_TURNS', '10')}",
                f"TAVILY_API_KEY_PROVIDER_NAME={self.api_key_provider_name}",
            ]

            # Build launch command
            launch_cmd = ["agentcore", "launch"]
            for env_var in env_vars:
                if env_var.split('=')[1]:  # Only add if value is not empty
                    launch_cmd.extend(["--env", env_var])

            print_info(f"Running: {' '.join(launch_cmd[:3])}... (with {len(env_vars)} environment variables)")

            # Set environment variables for cleaner output
            env = os.environ.copy()
            env['PYTHONIOENCODING'] = 'utf-8'  # Force UTF-8 encoding

            # Capture output for better error reporting
            result = subprocess.run(launch_cmd, text=True, encoding='utf-8', env=env, capture_output=True)

            # Print stdout if available
            if result.stdout:
                print(sanitize_output(result.stdout))

            if result.returncode != 0:
                print_error(f"Deployment failed with exit code {result.returncode}")
                if result.stderr:
                    print_error(f"Error details: {sanitize_output(result.stderr)}")

                # Provide helpful context
                if "already exists" in (result.stderr or "") or "AlreadyExists" in (result.stderr or ""):
                    print_info("The agent may already be deployed. Try running with --skip-agent or delete .bedrock_agentcore.yaml to redeploy from scratch")

                raise Exception("Agent deployment failed")

            print_success("Agent deployed successfully")
            print_info("Check .bedrock_agentcore.yaml for agent details")

            # Read and parse the config file to get agent ARN
            if config_file.exists():
                import yaml
                with open(config_file, 'r') as f:
                    config = yaml.safe_load(f)

                agent_arn = config.get('agents', {}).get(self.agent_name, {}).get('bedrock_agentcore', {}).get('agent_arn')
                agent_id = config.get('agents', {}).get(self.agent_name, {}).get('bedrock_agentcore', {}).get('agent_id')

                if agent_arn:
                    print_info(f"Agent ARN: {agent_arn}")
                if agent_id:
                    print_info(f"Agent ID: {agent_id}")

                return {
                    'agent_arn': agent_arn,
                    'agent_id': agent_id,
                    'agent_name': self.agent_name
                }

            return {}

        except Exception as e:
            print_error(f"Failed to deploy agent: {str(e)}")
            raise

    def deploy_all(self, skip_memory=False, skip_identity=False, skip_agent=False):
        """
        Deploy all AgentCore components
        """
        print_step("AWS Bedrock AgentCore Deployment")
        print_info(f"Region: {self.aws_region}")
        print_info(f"Account: {self.aws_account_id}")

        results = {}

        try:
            # Deploy Memory
            if not skip_memory:
                memory_result = self.deploy_memory()
                results['memory'] = memory_result
            else:
                print_warning("Skipping memory deployment")

            # Deploy Identity
            if not skip_identity:
                identity_result = self.deploy_identity()
                results['identity'] = identity_result
            else:
                print_warning("Skipping identity deployment")

            # Deploy Agent
            if not skip_agent:
                agent_result = self.deploy_agent()
                results['agent'] = agent_result
            else:
                print_warning("Skipping agent deployment")

            # Summary
            print_step("Deployment Summary")
            print_success("All components deployed successfully!")

            if 'memory' in results:
                print_info(f"Memory ID: {results['memory'].get('id')}")
            if 'identity' in results:
                print_info(f"Identity ARN: {results['identity'].get('workloadIdentityArn')}")
            if 'agent' in results:
                print_info(f"Agent ARN: {results['agent'].get('agent_arn')}")

            return results

        except Exception as e:
            print_error(f"Deployment failed: {str(e)}")
            sys.exit(1)


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Deploy AWS Bedrock AgentCore primitives')
    parser.add_argument('--skip-memory', action='store_true', help='Skip memory deployment')
    parser.add_argument('--skip-identity', action='store_true', help='Skip identity deployment')
    parser.add_argument('--skip-agent', action='store_true', help='Skip agent deployment')

    args = parser.parse_args()

    deployer = AgentCoreDeployer()
    deployer.deploy_all(
        skip_memory=args.skip_memory,
        skip_identity=args.skip_identity,
        skip_agent=args.skip_agent
    )


if __name__ == "__main__":
    main()
