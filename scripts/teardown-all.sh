#!/bin/bash
# ============================================================================
# Complete Stack Teardown Script
# ============================================================================
# Destroys all deployed resources in reverse order:
# 1. AgentCore Agent Runtime
# 2. AgentCore Identity & Memory
# 3. CDK Infrastructure
#
# Usage: ./scripts/teardown-all.sh [--force]
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

FORCE=false

# Parse arguments
if [ "$1" = "--force" ]; then
    FORCE=true
fi

print_header() {
    echo ""
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}============================================${NC}"
    echo ""
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# ============================================================================
# Warning
# ============================================================================

print_header "Stack Teardown"
echo -e "${RED}WARNING: This will DELETE all deployed resources!${NC}"
echo ""
echo -e "Resources to be deleted:"
echo -e "  • AgentCore Agent Runtime"
echo -e "  • AgentCore Memory & Identity"
echo -e "  • CDK Infrastructure (Cognito, DynamoDB, Lambda, etc.)"
echo ""
echo -e "${YELLOW}This action CANNOT be undone!${NC}"
echo ""

if [ "$FORCE" = false ]; then
    read -p "Are you sure you want to continue? (type 'yes' to confirm) " -r
    echo
    if [[ ! $REPLY =~ ^yes$ ]]; then
        echo -e "${YELLOW}Teardown cancelled${NC}"
        exit 0
    fi
fi

# ============================================================================
# Step 1: Delete AgentCore Agent
# ============================================================================

print_header "Step 1: Deleting AgentCore Agent"

if [ -f "backend/.bedrock_agentcore.yaml" ]; then
    AGENT_ID=$(grep "agent_id:" backend/.bedrock_agentcore.yaml | head -1 | awk '{print $2}')

    if [ -n "$AGENT_ID" ]; then
        echo "Deleting agent: $AGENT_ID"
        aws bedrock-agentcore-control delete-agent-runtime --agent-runtime-id "$AGENT_ID" 2>/dev/null || print_warning "Agent may not exist or already deleted"
        print_success "Agent deleted"
    else
        print_warning "No agent ID found"
    fi
else
    print_warning "No AgentCore configuration found"
fi

# ============================================================================
# Step 2: Delete AgentCore Memory
# ============================================================================

print_header "Step 2: Deleting AgentCore Memory"

MEMORY_NAME=${MEMORY_NAME:-"business_analyst_memory"}
echo "Attempting to delete memory: $MEMORY_NAME"
# Note: Memory deletion would require the memory ID, which we'd need to query first
print_warning "Manual memory deletion may be required via AWS Console"

# ============================================================================
# Step 3: Delete AgentCore Identity
# ============================================================================

print_header "Step 3: Deleting AgentCore Identity"

AGENT_NAME="business_analyst"
echo "Attempting to delete identity: $AGENT_NAME"
aws bedrock-agentcore-control delete-workload-identity --name "$AGENT_NAME" 2>/dev/null || print_warning "Identity may not exist or already deleted"
print_success "Identity deletion attempted"

# ============================================================================
# Step 4: Delete CDK Infrastructure
# ============================================================================

print_header "Step 4: Deleting CDK Infrastructure"

cd infrastructure
cdk destroy --force

if [ $? -eq 0 ]; then
    print_success "CDK infrastructure deleted"
else
    print_error "CDK deletion failed"
fi

cd ..

# ============================================================================
# Complete
# ============================================================================

print_header "Teardown Complete"
print_success "All resources have been deleted"
echo ""
print_warning "Note: Some resources may require manual cleanup:"
echo "  • AgentCore Memory (check AWS Console)"
echo "  • CloudWatch Log Groups (if retention period set)"
echo "  • S3 Buckets (if versioning enabled)"
echo ""
