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

Environment Variables Required:
    AWS_REGION - AWS region for deployment
    AWS_ACCOUNT_ID - AWS account ID
    MEMORY_NAME - Name for AgentCore memory resource
    TAVILY_API_KEY - Tavily API key to store in identity
    COGNITO_USER_POOL_ID - Cognito User Pool ID for agent authorization
    COGNITO_CLIENT_ID - Cognito Client ID for agent authorization
    WEBSOCKET_API_ID - WebSocket API Gateway ID for UI updates
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
load_dotenv()

try:
    import boto3
    from bedrock_agentcore_starter_toolkit.operations.memory.manager import MemoryManager
    from bedrock_agentcore_starter_toolkit.operations.memory.models.strategies import SemanticStrategy
    from bedrock_agentcore.services.identity import IdentityClient
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

        # Validate required variables
        self._validate_environment()

        # Initialize AWS clients
        self.memory_manager = MemoryManager(region_name=self.aws_region)
        self.identity_client = IdentityClient(region_name=self.aws_region)

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
            existing_memories = self.memory_manager.list_memories()
            memory_exists = any(m.get('name') == self.memory_name for m in existing_memories.get('memories', []))

            if memory_exists:
                print_warning(f"Memory '{self.memory_name}' already exists")
                # Get existing memory details
                for memory in existing_memories.get('memories', []):
                    if memory.get('name') == self.memory_name:
                        memory_resource = memory
                        break
            else:
                print_info(f"Creating new memory: {self.memory_name}")
                # Create new memory with semantic strategy
                memory_resource = self.memory_manager.get_or_create_memory(
                    name=self.memory_name,
                    description="Memory store for business analyst agent - stores conversation history and extracted competitive insights",
                    strategies=[
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
        Deploy or get existing AgentCore Identity (workload identity)
        Returns: Identity resource metadata
        """
        print_step("Step 2: Deploying AgentCore Identity")

        try:
            # Check if identity already exists
            print_info(f"Checking for existing identity: {self.agent_name}")

            try:
                # Try to get existing identity
                identity_response = self.identity_client.get_workload_identity(name=self.agent_name)
                print_warning(f"Identity '{self.agent_name}' already exists")
                identity_arn = identity_response.get('workloadIdentityArn')
            except Exception:
                # Create new identity
                print_info(f"Creating new identity: {self.agent_name}")
                identity_response = self.identity_client.create_workload_identity(name=self.agent_name)
                identity_arn = identity_response.get('workloadIdentityArn')

            print_success(f"Identity ready: {identity_arn}")

            # Store Tavily API key in identity
            print_info("Storing Tavily API key in identity...")
            try:
                self.identity_client.put_credential_provider(
                    workload_identity_name=self.agent_name,
                    provider_name="tavily_api_key",
                    provider_configuration={
                        "type": "api_key",
                        "api_key": self.tavily_api_key
                    }
                )
                print_success("Tavily API key stored successfully")
            except Exception as e:
                print_warning(f"Failed to store API key (may already exist): {str(e)}")

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

            # Check if agent is already configured
            config_file = Path(".bedrock_agentcore.yaml")

            if config_file.exists():
                print_warning("Agent configuration already exists")
                print_info("Using existing configuration from .bedrock_agentcore.yaml")
            else:
                print_info("Configuring agent...")
                # Run agentcore configure
                configure_cmd = [
                    "agentcore", "configure",
                    "-e", self.agent_entrypoint,
                    "--agent-name", self.agent_name
                ]

                result = subprocess.run(configure_cmd, capture_output=True, text=True)
                if result.returncode != 0:
                    print_error(f"Configuration failed: {result.stderr}")
                    raise Exception("Agent configuration failed")

                print_success("Agent configured successfully")

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
            ]

            # Build launch command
            launch_cmd = ["agentcore", "launch"]
            for env_var in env_vars:
                if env_var.split('=')[1]:  # Only add if value is not empty
                    launch_cmd.extend(["--env", env_var])

            print_info(f"Running: {' '.join(launch_cmd[:3])}... (with {len(env_vars)} environment variables)")

            result = subprocess.run(launch_cmd, capture_output=True, text=True)

            if result.returncode != 0:
                print_error(f"Deployment failed: {result.stderr}")
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
