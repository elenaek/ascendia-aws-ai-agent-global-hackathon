#!/bin/bash
# ============================================================================
# Master Deployment Orchestrator
# ============================================================================
# Deploys the entire AWS Hackathon stack in the correct order:
# 1. Validate environment
# 2. Deploy CDK infrastructure
# 3. Deploy AgentCore (memory, identity, agent)
# 4. Attach IAM policies
# 5. Output final configuration
#
# Usage: ./scripts/deploy-all.sh [--skip-validation] [--skip-cdk] [--skip-agentcore] [--skip-iam]
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Flags
SKIP_VALIDATION=false
SKIP_CDK=false
SKIP_AGENTCORE=false
SKIP_IAM=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-validation)
            SKIP_VALIDATION=true
            shift
            ;;
        --skip-cdk)
            SKIP_CDK=true
            shift
            ;;
        --skip-agentcore)
            SKIP_AGENTCORE=true
            shift
            ;;
        --skip-iam)
            SKIP_IAM=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--skip-validation] [--skip-cdk] [--skip-agentcore] [--skip-iam]"
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

# ============================================================================
# Start Deployment
# ============================================================================

print_header "AWS Hackathon Stack Deployment"
echo -e "This script will deploy:"
echo -e "  ${CYAN}1.${NC} CDK Infrastructure (Cognito, DynamoDB, Lambda, WebSocket API)"
echo -e "  ${CYAN}2.${NC} AgentCore Memory (conversation history storage)"
echo -e "  ${CYAN}3.${NC} AgentCore Identity (API key management)"
echo -e "  ${CYAN}4.${NC} AgentCore Agent (AI agent runtime)"
echo -e "  ${CYAN}5.${NC} IAM Policy Attachment (permissions configuration)"
echo ""
echo -e "${YELLOW}Note: This may take 10-15 minutes to complete.${NC}"
echo ""

read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# ============================================================================
# Step 1: Validate Environment
# ============================================================================

if [ "$SKIP_VALIDATION" = false ]; then
    print_header "Step 1: Validating Environment"

    if [ -f "./scripts/validate-env.sh" ]; then
        ./scripts/validate-env.sh
        if [ $? -ne 0 ]; then
            print_error "Environment validation failed"
            print_info "Fix the errors above and try again"
            exit 1
        fi
        print_success "Environment validated successfully"
    else
        print_warning "Validation script not found, skipping..."
    fi
else
    print_warning "Skipping environment validation (--skip-validation)"
fi

# ============================================================================
# Step 2: Deploy CDK Infrastructure
# ============================================================================

if [ "$SKIP_CDK" = false ]; then
    print_header "Step 2: Deploying CDK Infrastructure"

    cd infrastructure

    print_step "Synthesizing CDK stack..."
    cdk synth

    print_step "Deploying CDK stack..."
    cdk deploy --require-approval never

    if [ $? -ne 0 ]; then
        print_error "CDK deployment failed"
        exit 1
    fi

    print_success "CDK infrastructure deployed successfully"

    # Get CDK outputs
    print_step "Retrieving CDK outputs..."
    COGNITO_USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name InfrastructureStack --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text)
    COGNITO_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name InfrastructureStack --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" --output text)
    COGNITO_IDENTITY_POOL_ID=$(aws cloudformation describe-stacks --stack-name InfrastructureStack --query "Stacks[0].Outputs[?OutputKey=='IdentityPoolId'].OutputValue" --output text)
    WEBSOCKET_API_ID=$(aws cloudformation describe-stacks --stack-name InfrastructureStack --query "Stacks[0].Outputs[?OutputKey=='WebSocketApiId'].OutputValue" --output text)
    WEBSOCKET_API_URL=$(aws cloudformation describe-stacks --stack-name InfrastructureStack --query "Stacks[0].Outputs[?OutputKey=='WebSocketApiUrl'].OutputValue" --output text)

    print_success "CDK outputs retrieved"
    print_info "Cognito User Pool ID: $COGNITO_USER_POOL_ID"
    print_info "Cognito Client ID: $COGNITO_CLIENT_ID"
    print_info "WebSocket API ID: $WEBSOCKET_API_ID"

    # Update backend .env file
    print_step "Updating backend/.env with CDK outputs..."
    cd ..
    if [ -f "backend/.env" ]; then
        # Use sed to update or append values
        sed -i.bak "s|^COGNITO_USER_POOL_ID=.*|COGNITO_USER_POOL_ID=$COGNITO_USER_POOL_ID|" backend/.env || echo "COGNITO_USER_POOL_ID=$COGNITO_USER_POOL_ID" >> backend/.env
        sed -i.bak "s|^COGNITO_CLIENT_ID=.*|COGNITO_CLIENT_ID=$COGNITO_CLIENT_ID|" backend/.env || echo "COGNITO_CLIENT_ID=$COGNITO_CLIENT_ID" >> backend/.env
        sed -i.bak "s|^COGNITO_IDENTITY_POOL_ID=.*|COGNITO_IDENTITY_POOL_ID=$COGNITO_IDENTITY_POOL_ID|" backend/.env || echo "COGNITO_IDENTITY_POOL_ID=$COGNITO_IDENTITY_POOL_ID" >> backend/.env
        sed -i.bak "s|^WEBSOCKET_API_ID=.*|WEBSOCKET_API_ID=$WEBSOCKET_API_ID|" backend/.env || echo "WEBSOCKET_API_ID=$WEBSOCKET_API_ID" >> backend/.env
        rm backend/.env.bak 2>/dev/null || true
        print_success "Backend .env updated"
    else
        print_warning "backend/.env not found, skipping update"
    fi

else
    print_warning "Skipping CDK deployment (--skip-cdk)"
fi

# ============================================================================
# Step 3: Deploy AgentCore (Memory, Identity, Agent)
# ============================================================================

if [ "$SKIP_AGENTCORE" = false ]; then
    print_header "Step 3: Deploying AgentCore Primitives"

    print_step "Deploying AgentCore memory, identity, and agent..."
    python3 backend/scripts/deploy-agentcore.py

    if [ $? -ne 0 ]; then
        print_error "AgentCore deployment failed"
        exit 1
    fi

    print_success "AgentCore deployed successfully"

    # Get agent ARN from config file
    if [ -f "backend/.bedrock_agentcore.yaml" ]; then
        AGENT_ARN=$(grep "agent_arn:" backend/.bedrock_agentcore.yaml | head -1 | awk '{print $2}')
        print_info "Agent ARN: $AGENT_ARN"

        # Update web/.env with agent ARN
        if [ -f "web/.env" ]; then
            sed -i.bak "s|^NEXT_PUBLIC_AGENTCORE_ARN=.*|NEXT_PUBLIC_AGENTCORE_ARN=$AGENT_ARN|" web/.env || echo "NEXT_PUBLIC_AGENTCORE_ARN=$AGENT_ARN" >> web/.env
            rm web/.env.bak 2>/dev/null || true
            print_success "Web .env updated with Agent ARN"
        fi
    fi

else
    print_warning "Skipping AgentCore deployment (--skip-agentcore)"
fi

# ============================================================================
# Step 4: Attach IAM Policy to AgentCore Execution Role
# ============================================================================

if [ "$SKIP_IAM" = false ]; then
    print_header "Step 4: Attaching IAM Policy"

    print_step "Attaching CDK IAM policy to AgentCore execution role..."
    python3 backend/scripts/attach-iam-policy.py

    if [ $? -ne 0 ]; then
        print_warning "IAM policy attachment failed (non-critical)"
        print_info "You may need to attach the policy manually"
    else
        print_success "IAM policy attached successfully"
    fi

else
    print_warning "Skipping IAM policy attachment (--skip-iam)"
fi

# ============================================================================
# Step 5: Display Final Configuration
# ============================================================================

print_header "Deployment Complete!"

echo -e "${GREEN}✓ All components deployed successfully!${NC}"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo ""
echo -e "1. Update your ${BLUE}web/.env${NC} file with the following values:"
if [ -n "$COGNITO_USER_POOL_ID" ]; then
    echo -e "   ${YELLOW}NEXT_PUBLIC_COGNITO_USER_POOL_ID${NC}=$COGNITO_USER_POOL_ID"
fi
if [ -n "$COGNITO_CLIENT_ID" ]; then
    echo -e "   ${YELLOW}NEXT_PUBLIC_COGNITO_CLIENT_ID${NC}=$COGNITO_CLIENT_ID"
fi
if [ -n "$COGNITO_IDENTITY_POOL_ID" ]; then
    echo -e "   ${YELLOW}NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID${NC}=$COGNITO_IDENTITY_POOL_ID"
fi
if [ -n "$WEBSOCKET_API_URL" ]; then
    echo -e "   ${YELLOW}NEXT_PUBLIC_WEBSOCKET_URL${NC}=$WEBSOCKET_API_URL"
fi
if [ -n "$AGENT_ARN" ]; then
    echo -e "   ${YELLOW}NEXT_PUBLIC_AGENTCORE_ARN${NC}=$AGENT_ARN"
fi
echo ""
echo -e "2. Start your web frontend:"
echo -e "   ${BLUE}cd web && npm run dev${NC}"
echo ""
echo -e "3. Test the agent:"
echo -e "   ${BLUE}cd backend && agentcore invoke '{\"prompt\": \"Hello!\"}'${NC}"
echo ""
echo -e "${CYAN}Resources Created:${NC}"
echo -e "  • Cognito User Pool & Identity Pool"
echo -e "  • DynamoDB Tables (Companies, Competitors, Reviews, WebSocket Connections)"
echo -e "  • WebSocket API Gateway"
echo -e "  • Lambda Functions (Webhook, WebSocket handlers)"
echo -e "  • S3 Bucket (Raw reviews)"
echo -e "  • AgentCore Memory, Identity, and Agent Runtime"
echo ""
echo -e "${YELLOW}📝 See DEPLOYMENT.md for detailed information${NC}"
echo ""
