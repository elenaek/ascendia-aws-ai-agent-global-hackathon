#!/bin/bash
# ============================================================================
# Environment Validation Script
# ============================================================================
# Validates all prerequisites for deploying the AWS Hackathon stack
# Usage: ./scripts/validate-env.sh
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Tracking
ERRORS=0
WARNINGS=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Environment Validation${NC}"
echo -e "${BLUE}========================================${NC}"

# ============================================================================
# Helper Functions
# ============================================================================

check_command() {
    local cmd=$1
    local name=$2
    local required=$3

    if command -v "$cmd" &> /dev/null; then
        local version=$($cmd --version 2>&1 | head -1)
        echo -e "${GREEN}✓${NC} $name: ${version}"
        return 0
    else
        if [ "$required" = "true" ]; then
            echo -e "${RED}✗${NC} $name: Not found (Required)"
            ((ERRORS++))
            return 1
        else
            echo -e "${YELLOW}⚠${NC} $name: Not found (Optional)"
            ((WARNINGS++))
            return 1
        fi
    fi
}

check_env_var() {
    local var_name=$1
    local required=$2
    local var_value="${!var_name}"

    if [ -n "$var_value" ]; then
        # Mask sensitive values
        if [[ "$var_name" =~ (KEY|SECRET|TOKEN|PASSWORD|CREDS) ]]; then
            echo -e "${GREEN}✓${NC} $var_name: ${var_value:0:4}***"
        else
            echo -e "${GREEN}✓${NC} $var_name: $var_value"
        fi
        return 0
    else
        if [ "$required" = "true" ]; then
            echo -e "${RED}✗${NC} $var_name: Not set (Required)"
            ((ERRORS++))
            return 1
        else
            echo -e "${YELLOW}⚠${NC} $var_name: Not set (Optional)"
            ((WARNINGS++))
            return 1
        fi
    fi
}

# ============================================================================
# Step 1: Check for .env file
# ============================================================================

echo ""
echo -e "${BLUE}Step 1: Checking for .env file${NC}"

if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} Found .env file, loading variables..."
    set -a
    source .env
    set +a
else
    echo -e "${YELLOW}⚠${NC} No .env file found"
    echo -e "  Create one by copying .env.template:"
    echo -e "  ${BLUE}cp .env.template .env${NC}"
    ((WARNINGS++))
fi

# ============================================================================
# Step 2: Check Required CLI Tools
# ============================================================================

echo ""
echo -e "${BLUE}Step 2: Checking CLI tools${NC}"

check_command "aws" "AWS CLI" "true"
check_command "python3" "Python 3" "true"
check_command "pip" "pip" "true"
check_command "node" "Node.js" "true"
check_command "npm" "npm" "true"
check_command "cdk" "AWS CDK" "true"
check_command "docker" "Docker" "false"

# Check for agentcore CLI
if python3 -c "import bedrock_agentcore_starter_toolkit" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} bedrock-agentcore-starter-toolkit: Installed"
else
    echo -e "${RED}✗${NC} bedrock-agentcore-starter-toolkit: Not installed (Required)"
    echo -e "  Install with: ${BLUE}pip install bedrock-agentcore-starter-toolkit${NC}"
    ((ERRORS++))
fi

# ============================================================================
# Step 3: Validate AWS Credentials
# ============================================================================

echo ""
echo -e "${BLUE}Step 3: Validating AWS credentials${NC}"

if aws sts get-caller-identity &> /dev/null; then
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
    USER_ARN=$(aws sts get-caller-identity --query Arn --output text 2>/dev/null)
    echo -e "${GREEN}✓${NC} AWS Credentials valid"
    echo -e "  Account: $ACCOUNT_ID"
    echo -e "  Identity: $USER_ARN"

    # Check if AWS_ACCOUNT_ID matches
    if [ -n "$AWS_ACCOUNT_ID" ] && [ "$AWS_ACCOUNT_ID" != "$ACCOUNT_ID" ]; then
        echo -e "${YELLOW}⚠${NC} AWS_ACCOUNT_ID in .env ($AWS_ACCOUNT_ID) doesn't match actual account ($ACCOUNT_ID)"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}✗${NC} AWS Credentials invalid or not configured"
    echo -e "  Configure with: ${BLUE}aws configure${NC}"
    ((ERRORS++))
fi

# ============================================================================
# Step 4: Check Required Environment Variables
# ============================================================================

echo ""
echo -e "${BLUE}Step 4: Checking required environment variables${NC}"

# AWS Configuration
check_env_var "AWS_REGION" "true"
check_env_var "AWS_ACCOUNT_ID" "true"

# API Keys
check_env_var "TAVILY_API_KEY" "true"
check_env_var "DATA_FOR_SEO_CREDS_B64" "true"

# AgentCore Configuration
check_env_var "MEMORY_NAME" "false"
check_env_var "MAX_RECENT_TURNS" "false"

# ============================================================================
# Step 5: Check Post-Deployment Variables (Optional)
# ============================================================================

echo ""
echo -e "${BLUE}Step 5: Checking post-deployment variables (optional)${NC}"

check_env_var "COGNITO_USER_POOL_ID" "false"
check_env_var "COGNITO_CLIENT_ID" "false"
check_env_var "COGNITO_IDENTITY_POOL_ID" "false"
check_env_var "WEBSOCKET_API_ID" "false"

# ============================================================================
# Step 6: Check Python Dependencies
# ============================================================================

echo ""
echo -e "${BLUE}Step 6: Checking Python dependencies${NC}"

PYTHON_DEPS=("boto3" "bedrock_agentcore" "strands_agents" "python-dotenv")

for dep in "${PYTHON_DEPS[@]}"; do
    if python3 -c "import $dep" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Python package: $dep"
    else
        echo -e "${YELLOW}⚠${NC} Python package: $dep (Not installed)"
        echo -e "  Install from backend/requirements.txt"
        ((WARNINGS++))
    fi
done

# ============================================================================
# Step 7: Check CDK Bootstrap
# ============================================================================

echo ""
echo -e "${BLUE}Step 7: Checking CDK bootstrap status${NC}"

if [ -n "$AWS_ACCOUNT_ID" ] && [ -n "$AWS_REGION" ]; then
    if aws cloudformation describe-stacks --stack-name CDKToolkit --region "$AWS_REGION" &> /dev/null; then
        echo -e "${GREEN}✓${NC} CDK is bootstrapped in $AWS_REGION"
    else
        echo -e "${YELLOW}⚠${NC} CDK not bootstrapped in $AWS_REGION"
        echo -e "  Bootstrap with: ${BLUE}cd infrastructure && cdk bootstrap${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠${NC} Cannot check CDK bootstrap status (missing AWS_ACCOUNT_ID or AWS_REGION)"
fi

# ============================================================================
# Summary
# ============================================================================

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Validation Summary${NC}"
echo -e "${BLUE}========================================${NC}"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo -e "${GREEN}  Ready for deployment${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Validation passed with $WARNINGS warning(s)${NC}"
    echo -e "${YELLOW}  You can proceed, but some features may not work${NC}"
    exit 0
else
    echo -e "${RED}✗ Validation failed${NC}"
    echo -e "${RED}  Errors: $ERRORS${NC}"
    echo -e "${YELLOW}  Warnings: $WARNINGS${NC}"
    echo ""
    echo -e "Please fix the errors above before deploying."
    echo -e "See .env.template for required variables."
    exit 1
fi
