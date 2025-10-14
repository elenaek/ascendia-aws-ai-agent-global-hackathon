#!/bin/bash
# ============================================================================
# Interactive Environment Setup Script
# ============================================================================
# Creates and configures .env files with interactive prompts
# Auto-detects AWS account information when possible
# Usage: ./scripts/setup-env.sh [--force] [--non-interactive]
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Flags
FORCE_SETUP=false
NON_INTERACTIVE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE_SETUP=true
            shift
            ;;
        --non-interactive)
            NON_INTERACTIVE=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--force] [--non-interactive]"
            exit 1
            ;;
    esac
done

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo ""
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}============================================${NC}"
    echo ""
}

print_step() {
    echo ""
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "  $1"
}

prompt_input() {
    local var_name=$1
    local prompt_text=$2
    local default_value=$3
    local is_secret=$4
    local result

    if [ "$NON_INTERACTIVE" = true ] && [ -n "$default_value" ]; then
        result="$default_value"
    else
        if [ -n "$default_value" ]; then
            echo -ne "${BLUE}$prompt_text${NC} [${YELLOW}$default_value${NC}]: "
        else
            echo -ne "${BLUE}$prompt_text${NC}: "
        fi

        if [ "$is_secret" = "true" ]; then
            read -s result
            echo ""
        else
            read result
        fi

        # Use default if no input provided
        if [ -z "$result" ] && [ -n "$default_value" ]; then
            result="$default_value"
        fi
    fi

    eval "$var_name='$result'"
}

# ============================================================================
# Start Setup
# ============================================================================

print_header "Interactive Environment Setup"

echo -e "This script will configure your environment variables for deployment."
echo -e "It will create ${BLUE}backend/.env${NC} and ${BLUE}web/.env${NC} files."
echo ""

# ============================================================================
# Check if .env files already exist
# ============================================================================

BACKEND_ENV_EXISTS=false
WEB_ENV_EXISTS=false

if [ -f "backend/.env" ]; then
    BACKEND_ENV_EXISTS=true
fi

if [ -f "web/.env" ]; then
    WEB_ENV_EXISTS=true
fi

if [ "$BACKEND_ENV_EXISTS" = true ] || [ "$WEB_ENV_EXISTS" = true ]; then
    if [ "$FORCE_SETUP" = false ]; then
        echo -e "${YELLOW}Existing .env files detected:${NC}"
        [ "$BACKEND_ENV_EXISTS" = true ] && echo -e "  • backend/.env"
        [ "$WEB_ENV_EXISTS" = true ] && echo -e "  • web/.env"
        echo ""
        echo -e "Use ${BLUE}--force${NC} to overwrite, or manually edit the files."
        exit 0
    else
        print_warning "Overwriting existing .env files (--force flag used)"
    fi
fi

# ============================================================================
# Step 1: Detect AWS Configuration
# ============================================================================

print_header "Step 1: AWS Configuration"

# Try to auto-detect AWS account ID
DETECTED_ACCOUNT_ID=""
DETECTED_REGION=""
DETECTED_ARN=""
DETECTED_USER_ID=""
USE_AWS_CLI_CREDS=false

if command -v aws &> /dev/null; then
    print_step "Detecting AWS configuration from AWS CLI..."

    if aws sts get-caller-identity &> /dev/null; then
        DETECTED_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
        DETECTED_REGION=$(aws configure get region 2>/dev/null || echo "us-east-1")
        DETECTED_ARN=$(aws sts get-caller-identity --query Arn --output text 2>/dev/null)
        DETECTED_USER_ID=$(aws sts get-caller-identity --query UserId --output text 2>/dev/null)

        print_success "AWS CLI credentials detected"
        echo ""
        print_info "Account ID:  $DETECTED_ACCOUNT_ID"
        print_info "Region:      $DETECTED_REGION"
        print_info "Identity:    $DETECTED_ARN"
        echo ""

        # Display informational box about credential usage
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${CYAN}ℹ  AWS Credential Usage:${NC}"
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        print_info "${GREEN}Backend${NC} deployment scripts: Use AWS CLI at runtime"
        print_info "${GREEN}Frontend${NC} API routes: Need credentials in web/.env"
        echo ""
        print_info "Your credentials will be stored in BOTH .env files"
        print_info "for consistency, but backend scripts will use AWS CLI."
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""

        if [ "$NON_INTERACTIVE" = false ]; then
            echo -ne "${BLUE}Use these AWS credentials? (y/n)${NC} [${YELLOW}y${NC}]: "
            read use_cli
            if [[ "$use_cli" =~ ^[Yy]$|^$ ]]; then
                USE_AWS_CLI_CREDS=true
                print_success "Will use detected AWS credentials"
            fi
        else
            USE_AWS_CLI_CREDS=true
        fi
    else
        print_warning "AWS CLI configured but credentials are invalid"
        print_info "You'll need to provide credentials manually"
    fi
else
    print_warning "AWS CLI not found"
    print_info "Install with: https://aws.amazon.com/cli/"
fi

# ============================================================================
# Step 2: Gather Required Information
# ============================================================================

print_header "Step 2: Required Configuration"

# AWS Region
print_step "AWS Region"
echo -e "  ${CYAN}Note: AgentCore preview requires us-east-1${NC}"
prompt_input AWS_REGION "Enter AWS region" "${DETECTED_REGION:-us-east-1}" false

# AWS Account ID
print_step "AWS Account ID"
if [ -n "$DETECTED_ACCOUNT_ID" ]; then
    prompt_input AWS_ACCOUNT_ID "Enter AWS account ID" "$DETECTED_ACCOUNT_ID" false
else
    prompt_input AWS_ACCOUNT_ID "Enter AWS account ID (12 digits)" "" false

    # Validate account ID format
    if ! [[ "$AWS_ACCOUNT_ID" =~ ^[0-9]{12}$ ]]; then
        print_error "Invalid account ID format (must be 12 digits)"
        exit 1
    fi
fi

# AWS Credentials
if [ "$USE_AWS_CLI_CREDS" = true ]; then
    print_step "AWS Credentials for Frontend"
    echo -e "  ${CYAN}Note: Frontend needs static credentials for Next.js API routes${NC}"
    echo ""

    # Try to get credentials from AWS CLI configuration
    CLI_ACCESS_KEY=$(aws configure get aws_access_key_id 2>/dev/null || echo "")
    CLI_SECRET_KEY=$(aws configure get aws_secret_access_key 2>/dev/null || echo "")

    if [ -n "$CLI_ACCESS_KEY" ] && [ -n "$CLI_SECRET_KEY" ]; then
        print_success "Found static credentials in AWS CLI config"
        AWS_ACCESS_KEY_ID="$CLI_ACCESS_KEY"
        AWS_SECRET_ACCESS_KEY="$CLI_SECRET_KEY"
        print_info "These will be stored in both .env files"
    else
        print_warning "AWS CLI uses temporary credentials or IAM role"
        print_info "Frontend API routes require static AWS credentials"
        echo ""
        prompt_input AWS_ACCESS_KEY_ID "Enter AWS Access Key ID" "" false
        prompt_input AWS_SECRET_ACCESS_KEY "Enter AWS Secret Access Key" "" true
    fi
else
    print_step "AWS Credentials"
    echo -e "  ${CYAN}Note: These will be stored in both backend/.env and web/.env${NC}"
    prompt_input AWS_ACCESS_KEY_ID "Enter AWS Access Key ID" "" false
    prompt_input AWS_SECRET_ACCESS_KEY "Enter AWS Secret Access Key" "" true
fi

# Tavily API Key
print_step "Tavily API Key (Required)"
echo -e "  ${CYAN}Get your API key from: https://tavily.com${NC}"
prompt_input TAVILY_API_KEY "Enter Tavily API key" "" false

if [ -z "$TAVILY_API_KEY" ]; then
    print_error "Tavily API key is required"
    print_info "Sign up at https://tavily.com to get an API key"
    exit 1
fi

# ============================================================================
# Step 3: Optional Configuration
# ============================================================================

print_header "Step 3: Optional Configuration"

print_step "AgentCore Memory Configuration"
prompt_input MEMORY_NAME "Memory name" "business_analyst_memory" false
prompt_input MAX_RECENT_TURNS "Max recent conversation in agent chat" "10" false

print_step "Security & Access Control (Optional)"
echo -e "  ${CYAN}Note: Both allowlists are optional. Leave empty to allow all.${NC}"
echo ""

# Email Allowlist
echo -e "  ${BLUE}Email Allowlist${NC} - Restricts who can sign up with Cognito"
echo -e "  Format: comma-separated emails (e.g., user1@example.com,user2@example.com)"
prompt_input ALLOWED_SIGNUP_EMAILS "Enter allowed signup emails" "" false

# IP Allowlist
echo -e ""
echo -e "  ${BLUE}IP Allowlist${NC} - Restricts which IPs can access the web frontend"
echo -e "  Format: comma-separated IPs or CIDR ranges (e.g., 192.168.1.100,10.0.0.0/8)"
prompt_input ALLOWED_IPS "Enter allowed IPs/CIDR ranges" "" false

# ============================================================================
# Step 4: Create Backend .env File
# ============================================================================

print_header "Step 4: Creating Backend .env File"

print_step "Writing backend/.env..."

cat > backend/.env << EOF
# ============================================================================
# AWS Hackathon Project - Backend Environment Variables
# ============================================================================
# Auto-generated by scripts/setup-env.sh
# Generated: $(date)
# ============================================================================

# ============================================================================
# AWS ACCOUNT CONFIGURATION
# ============================================================================
AWS_REGION=$AWS_REGION
AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID

# AWS Credentials
# - Backend deployment scripts use AWS CLI credential chain (not these values)
# - Stored here for consistency with web/.env
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY

# ============================================================================
# THIRD-PARTY API KEYS
# ============================================================================

# Tavily API Key (Required for web search)
TAVILY_API_KEY=$TAVILY_API_KEY

# ============================================================================
# AWS BEDROCK AGENTCORE CONFIGURATION
# ============================================================================

# AgentCore Memory Configuration
MEMORY_NAME=$MEMORY_NAME
MAX_RECENT_TURNS=$MAX_RECENT_TURNS

# ============================================================================
# CDK DEPLOYMENT OUTPUTS (Auto-populated after CDK deployment)
# ============================================================================

# AWS Cognito Configuration (populated by deploy-all.sh)
COGNITO_USER_POOL_ID=
COGNITO_CLIENT_ID=
COGNITO_IDENTITY_POOL_ID=

# WebSocket API Gateway (populated by deploy-all.sh)
WEBSOCKET_API_ID=

# ============================================================================
# DEPLOYMENT NOTES
# ============================================================================
# The CDK deployment values above will be automatically populated when you run:
#   ./scripts/deploy-all.sh
#
# To manually retrieve CDK outputs:
#   aws cloudformation describe-stacks --stack-name InfrastructureStack --query 'Stacks[0].Outputs'
# ============================================================================
EOF

print_success "Created backend/.env"

# ============================================================================
# Step 4b: Create Infrastructure .env File
# ============================================================================

print_step "Writing infrastructure/.env..."

cat > infrastructure/.env << EOF
# ============================================================================
# AWS Hackathon Project - Infrastructure (CDK) Environment Variables
# ============================================================================
# Auto-generated by scripts/setup-env.sh
# Generated: $(date)
# ============================================================================

# ============================================================================
# THIRD-PARTY API KEYS (Required for CDK deployment)
# ============================================================================

# Tavily API Key (Required for AgentCore agent web search)
TAVILY_API_KEY=$TAVILY_API_KEY

# ============================================================================
# SECURITY & ACCESS CONTROL (Optional)
# ============================================================================

# Email Allowlist for Cognito Sign-Up (Optional)
# Leave empty to allow all email addresses to sign up
# Format: comma-separated emails (e.g., user1@example.com,user2@example.com)
ALLOWED_SIGNUP_EMAILS=$ALLOWED_SIGNUP_EMAILS

# ============================================================================
# DEPLOYMENT NOTES
# ============================================================================
# This file is used by the CDK stack during deployment.
# CDK reads these environment variables to:
# - Create SSM Parameter with Tavily API key
# - Configure Pre-Signup Lambda with email allowlist
# ============================================================================
EOF

print_success "Created infrastructure/.env"

# ============================================================================
# Step 5: Create Web .env File
# ============================================================================

print_header "Step 5: Creating Web .env File"

print_step "Writing web/.env..."

cat > web/.env << EOF
# ============================================================================
# AWS Hackathon Project - Web Frontend Environment Variables
# ============================================================================
# Auto-generated by scripts/setup-env.sh
# Generated: $(date)
# ============================================================================

# ============================================================================
# AWS CONFIGURATION (Public - exposed to browser)
# ============================================================================
NEXT_PUBLIC_AWS_REGION=$AWS_REGION
AWS_REGION=$AWS_REGION
AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID

# AWS Credentials (for Next.js API routes)
# - Required for server-side API routes to call AWS services
# - API routes use these to create CognitoIdentityClient
# - That client exchanges user ID tokens for temporary, user-scoped credentials
# - This enables row-level security for DynamoDB access
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY

# ============================================================================
# AWS COGNITO (Auto-populated after CDK deployment)
# ============================================================================
NEXT_PUBLIC_COGNITO_USER_POOL_ID=
NEXT_PUBLIC_COGNITO_CLIENT_ID=
NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID=

# ============================================================================
# WEBSOCKET API (Auto-populated after CDK deployment)
# ============================================================================
NEXT_PUBLIC_WEBSOCKET_URL=

# ============================================================================
# BEDROCK AGENTCORE (Auto-populated after AgentCore deployment)
# ============================================================================
NEXT_PUBLIC_AGENTCORE_ARN=

# ============================================================================
# DYNAMODB TABLES (Auto-populated after CDK deployment)
# ============================================================================
DYNAMODB_COMPANIES_TABLE=
DYNAMODB_COMPETITORS_TABLE=
DYNAMODB_COMPANY_COMPETITORS_TABLE=

# ============================================================================
# OPTIONAL CONFIGURATION
# ============================================================================

# IP Whitelist (Optional - for middleware protection)
# Leave empty to allow all IPs
# Format: comma-separated IPs or CIDR ranges
# Example: ALLOWED_IPS=192.168.1.100,10.0.0.0/8
ALLOWED_IPS=$ALLOWED_IPS

# ============================================================================
# DEPLOYMENT NOTES
# ============================================================================
# The values above will be automatically populated when you run:
#   ./scripts/deploy-all.sh
#
# CDK outputs will populate: Cognito IDs, WebSocket URL, DynamoDB tables
# AgentCore deployment will populate: NEXT_PUBLIC_AGENTCORE_ARN
# ============================================================================
EOF

print_success "Created web/.env"

# ============================================================================
# Summary
# ============================================================================

print_header "Setup Complete!"

echo -e "${GREEN}✓ Environment files created successfully!${NC}"
echo ""
echo -e "Created files:"
echo -e "  • ${BLUE}backend/.env${NC} - Backend configuration"
echo -e "  • ${BLUE}infrastructure/.env${NC} - CDK deployment configuration"
echo -e "  • ${BLUE}web/.env${NC} - Frontend configuration"
echo ""
echo -e "${CYAN}Configuration Summary:${NC}"
if [ -n "$DETECTED_ARN" ]; then
    echo -e "  • AWS Identity: ${BLUE}$DETECTED_ARN${NC}"
fi
if [ -n "$AWS_ACCOUNT_ID" ]; then
    echo -e "  • AWS Account: ${BLUE}$AWS_ACCOUNT_ID${NC}"
fi
if [ -n "$AWS_REGION" ]; then
    echo -e "  • AWS Region: ${BLUE}$AWS_REGION${NC}"
fi
if [ "$USE_AWS_CLI_CREDS" = true ]; then
    echo -e "  • Credential Source: ${GREEN}AWS CLI detected and configured${NC}"
else
    echo -e "  • Credential Source: ${YELLOW}Manually configured${NC}"
fi
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo ""
echo -e "1. Review the generated files (optional):"
echo -e "   ${BLUE}cat backend/.env${NC}"
echo -e "   ${BLUE}cat web/.env${NC}"
echo ""
echo -e "2. Deploy the stack:"
echo -e "   ${BLUE}./scripts/deploy-all.sh${NC}"
echo ""
echo -e "${YELLOW}Note:${NC} Some values (Cognito, WebSocket, AgentCore ARN) will be"
echo -e "automatically populated during deployment."
echo ""
