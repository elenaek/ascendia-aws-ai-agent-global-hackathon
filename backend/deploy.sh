#!/bin/bash
# ============================================================================
# Backend Agent Deployment Script
# ============================================================================
# Simplified deployment script that uses Python scripts for AgentCore deployment
#
# Usage: ./backend/deploy.sh [--agent-only] [--with-iam]
# ============================================================================

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Flags
AGENT_ONLY=false
WITH_IAM=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --agent-only)
            AGENT_ONLY=true
            shift
            ;;
        --with-iam)
            WITH_IAM=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--agent-only] [--with-iam]"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}=== Deploying Backend Agent ===${NC}"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found in backend directory${NC}"
    echo -e "${YELLOW}Tip: Copy .env.template and fill in required values${NC}"
    exit 1
fi

# Deploy AgentCore using Python script
echo -e "${BLUE}Using programmatic deployment via Python scripts...${NC}"
echo ""

if [ "$AGENT_ONLY" = true ]; then
    echo -e "${YELLOW}Deploying agent only (skipping memory and identity)${NC}"
    python3 scripts/deploy-agentcore.py --skip-memory --skip-identity
else
    echo -e "${BLUE}Deploying all AgentCore components (memory, identity, agent)${NC}"
    python3 scripts/deploy-agentcore.py
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}Deployment failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Agent deployed successfully${NC}"
echo ""

# Attach IAM policy if requested
if [ "$WITH_IAM" = true ]; then
    echo -e "${BLUE}Attaching IAM policy to agent execution role...${NC}"
    python3 scripts/attach-iam-policy.py

    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}⚠ IAM policy attachment failed (you may need to attach manually)${NC}"
    else
        echo -e "${GREEN}✓ IAM policy attached${NC}"
    fi
fi

echo ""
echo -e "${BLUE}=== Deployment Complete ===${NC}"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo -e "  1. Test your agent: ${BLUE}agentcore invoke '{\"prompt\": \"Hello!\"}'${NC}"
echo -e "  2. View logs: Check CloudWatch Logs for your agent"
echo -e "  3. Update frontend .env with agent ARN from ${BLUE}.bedrock_agentcore.yaml${NC}"
echo ""
