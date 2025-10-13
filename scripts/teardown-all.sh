#!/bin/bash
# ============================================================================
# Complete Stack Teardown Script
# ============================================================================
# Destroys all deployed resources in reverse order:
# 1. Detach IAM Policy from AgentCore Execution Role
# 2. Destroy AgentCore Resources (agent, CodeBuild, ECR) via agentcore destroy
# 3. Delete AgentCore Identity & Memory Primitives (API key, identity, memory) via boto3
# 4. Delete CodeBuild Source S3 Bucket
# 5. Delete CDK Infrastructure
# 6. [Optional] Delete CloudWatch Log Groups
# 7. [Optional] Clean Up Configuration Files
#
# Usage: ./scripts/teardown-all.sh [OPTIONS]
#
# Options:
#   --force, --yes           Skip confirmation prompts
#   --dry-run                Show what would be deleted without deleting
#   --skip-iam               Skip IAM policy detachment
#   --skip-agentcore         Skip AgentCore resource deletion
#   --skip-ecr               Skip ECR repository cleanup
#   --skip-codebuild         Skip CodeBuild cleanup
#   --skip-s3                Skip S3 bucket cleanup
#   --skip-cdk               Skip CDK destruction
#   --keep-logs              Don't delete CloudWatch log groups
#   --keep-config            Don't delete configuration files
#   --delete-all             Delete everything including logs and config
#   --strict                 Exit on first error
# ============================================================================

# Note: We don't use 'set -e' here because we want to continue on errors
# unless --strict mode is enabled. Error handling is done in execute_command()

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Flags
FORCE=false
DRY_RUN=false
SKIP_IAM=false
SKIP_AGENTCORE=false
SKIP_ECR=false
SKIP_CODEBUILD=false
SKIP_S3=false
SKIP_CDK=false
KEEP_LOGS=false
KEEP_CONFIG=false
DELETE_ALL=false
STRICT_MODE=false

# Configuration
AWS_REGION=${AWS_REGION:-"us-east-1"}
CDK_STACK_NAME=${CDK_STACK_NAME:-"InfrastructureStack"}
AGENT_NAME=${AGENT_NAME:-"business_analyst"}
MEMORY_NAME=${MEMORY_NAME:-"business_analyst_memory"}
API_KEY_PROVIDER_NAME="${AGENT_NAME}_tavily_api_key"
CONFIG_FILE="backend/.bedrock_agentcore.yaml"

# Error tracking
FAILED_OPERATIONS=()

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force|--yes)
            FORCE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-iam)
            SKIP_IAM=true
            shift
            ;;
        --skip-agentcore)
            SKIP_AGENTCORE=true
            shift
            ;;
        --skip-ecr)
            SKIP_ECR=true
            shift
            ;;
        --skip-codebuild)
            SKIP_CODEBUILD=true
            shift
            ;;
        --skip-s3)
            SKIP_S3=true
            shift
            ;;
        --skip-cdk)
            SKIP_CDK=true
            shift
            ;;
        --keep-logs)
            KEEP_LOGS=true
            shift
            ;;
        --keep-config)
            KEEP_CONFIG=true
            shift
            ;;
        --delete-all)
            DELETE_ALL=true
            KEEP_LOGS=false
            KEEP_CONFIG=false
            shift
            ;;
        --strict)
            STRICT_MODE=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--force] [--dry-run] [--skip-*] [--keep-*] [--delete-all] [--strict]"
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

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "  $1"
}

print_dry_run() {
    echo -e "${MAGENTA}[DRY RUN]${NC} Would delete: $1"
}

# Execute command with error handling
execute_command() {
    local description=$1
    shift
    local command=("$@")

    if [ "$DRY_RUN" = true ]; then
        print_dry_run "$description"
        return 0
    fi

    # Capture both stdout and stderr
    local output
    local exit_code

    if output=$("${command[@]}" 2>&1); then
        return 0
    else
        exit_code=$?
        FAILED_OPERATIONS+=("$description")

        if [ "$STRICT_MODE" = true ]; then
            print_error "$description failed (exit code: $exit_code)"
            if [ -n "$output" ]; then
                echo -e "${RED}Error output:${NC}"
                echo "$output" | sed 's/^/  /'  # Indent error output
            fi
            exit $exit_code
        else
            print_warning "$description failed (continuing...)"
            if [ -n "$output" ]; then
                echo -e "${YELLOW}Error details:${NC}"
                echo "$output" | sed 's/^/  /'  # Indent error output
            fi
            return 0  # Always return 0 in non-strict mode to continue execution
        fi
    fi
}

# Check if resource exists
resource_exists() {
    local check_command=("$@")
    "${check_command[@]}" &>/dev/null
    return $?
}

# Read value from YAML config
read_config_value() {
    local key=$1
    local file=$2

    if [ ! -f "$file" ]; then
        return 1
    fi

    grep "$key:" "$file" | head -1 | awk '{print $2}'
}

# ============================================================================
# Warning and Confirmation
# ============================================================================

print_header "Stack Teardown"

if [ "$DRY_RUN" = true ]; then
    echo -e "${MAGENTA}DRY RUN MODE - No resources will be deleted${NC}"
    echo ""
fi

echo -e "${RED}WARNING: This will DELETE all deployed resources!${NC}"
echo ""
echo -e "Resources to be deleted:"

# Show what will be deleted based on flags
if [ "$SKIP_IAM" = false ]; then
    echo -e "  • IAM Policy (detached from AgentCore execution role)"
fi
if [ "$SKIP_AGENTCORE" = false ]; then
    echo -e "  • AgentCore Resources (via agentcore destroy):"
    echo -e "    - Agent Runtime"
    if [ "$SKIP_CODEBUILD" = false ]; then
        echo -e "    - CodeBuild Project"
    fi
    if [ "$SKIP_ECR" = false ]; then
        echo -e "    - ECR Images & Repository"
    fi
    echo -e "  • AgentCore Identity & Memory Primitives (via boto3):"
    echo -e "    - API Key Credential Provider"
    echo -e "    - Workload Identity"
    echo -e "    - Memory"
fi
if [ "$SKIP_S3" = false ]; then
    echo -e "  • CodeBuild Source S3 Bucket"
fi
if [ "$SKIP_CDK" = false ]; then
    echo -e "  • CDK Infrastructure (Cognito, DynamoDB, Lambda, WebSocket API, etc.)"
fi
if [ "$KEEP_LOGS" = false ]; then
    echo -e "  • CloudWatch Log Groups"
fi
if [ "$KEEP_CONFIG" = false ]; then
    echo -e "  • Local Configuration Files"
fi

echo ""
echo -e "${YELLOW}This action CANNOT be undone!${NC}"
echo ""

if [ "$FORCE" = false ] && [ "$DRY_RUN" = false ]; then
    read -p "Are you sure you want to continue? (type 'yes' to confirm) " -r
    echo
    if [[ ! $REPLY =~ ^yes$ ]]; then
        echo -e "${YELLOW}Teardown cancelled${NC}"
        exit 0
    fi
fi

# ============================================================================
# Step 1: Detach IAM Policy from AgentCore Execution Role
# ============================================================================

if [ "$SKIP_IAM" = false ]; then
    print_header "Step 1: Detaching IAM Policy from AgentCore Execution Role"

    if [ -f "$CONFIG_FILE" ]; then
        EXECUTION_ROLE_ARN=$(read_config_value "execution_role" "$CONFIG_FILE")

        if [ -n "$EXECUTION_ROLE_ARN" ]; then
            ROLE_NAME=$(echo "$EXECUTION_ROLE_ARN" | awk -F'/' '{print $NF}')
            print_info "Execution role: $ROLE_NAME"

            # Get policy ARN from CloudFormation stack
            if resource_exists aws cloudformation describe-stacks --stack-name "$CDK_STACK_NAME" --region "$AWS_REGION"; then
                POLICY_ARN=$(aws cloudformation describe-stacks \
                    --stack-name "$CDK_STACK_NAME" \
                    --region "$AWS_REGION" \
                    --query "Stacks[0].Outputs[?OutputKey=='AgentCoreSecretsPolicyArn'].OutputValue" \
                    --output text 2>/dev/null)

                if [ -n "$POLICY_ARN" ]; then
                    print_info "Policy ARN: $POLICY_ARN"

                    # Check if policy is attached
                    if resource_exists aws iam list-attached-role-policies --role-name "$ROLE_NAME" --region "$AWS_REGION"; then
                        if aws iam list-attached-role-policies --role-name "$ROLE_NAME" --region "$AWS_REGION" | grep -q "$POLICY_ARN"; then
                            execute_command "Detach IAM policy from $ROLE_NAME" \
                                aws iam detach-role-policy \
                                --role-name "$ROLE_NAME" \
                                --policy-arn "$POLICY_ARN" \
                                --region "$AWS_REGION"
                            print_success "IAM policy detached"
                        else
                            print_warning "Policy not attached to role"
                        fi
                    else
                        print_warning "Could not check attached policies"
                    fi
                else
                    print_warning "Policy ARN not found in stack outputs"
                fi
            else
                print_warning "CDK stack not found, skipping policy detachment"
            fi
        else
            print_warning "No execution role found in config"
        fi
    else
        print_warning "No AgentCore configuration found ($CONFIG_FILE)"
    fi
else
    print_warning "Skipping IAM policy detachment (--skip-iam)"
fi

# ============================================================================
# Step 2: Destroy AgentCore Resources (Agent, CodeBuild, ECR)
# ============================================================================

if [ "$SKIP_AGENTCORE" = false ]; then
    print_header "Step 2: Destroying AgentCore Resources"

    if [ -f "$CONFIG_FILE" ]; then
        cd backend

        print_info "Using agentcore destroy to clean up:"
        print_info "  • Agent runtime"
        if [ "$SKIP_CODEBUILD" = false ]; then
            print_info "  • CodeBuild project"
        fi
        if [ "$SKIP_ECR" = false ]; then
            print_info "  • ECR images and repository"
        fi

        # Build destroy command arguments
        DESTROY_ARGS="--agent $AGENT_NAME"

        if [ "$DRY_RUN" = true ]; then
            DESTROY_ARGS="$DESTROY_ARGS --dry-run"
        fi

        if [ "$FORCE" = true ] || [ "$DRY_RUN" = true ]; then
            DESTROY_ARGS="$DESTROY_ARGS --force"
        fi

        # Delete ECR repository by default (matches previous behavior)
        if [ "$SKIP_ECR" = false ]; then
            DESTROY_ARGS="$DESTROY_ARGS --delete-ecr-repo"
        fi

        print_step "Running: agentcore destroy $DESTROY_ARGS"

        if [ "$DRY_RUN" = false ]; then
            if agentcore destroy $DESTROY_ARGS 2>&1; then
                print_success "AgentCore resources destroyed successfully"
            else
                exit_code=$?
                print_error "AgentCore destroy failed (exit code: $exit_code)"
                FAILED_OPERATIONS+=("AgentCore resource destruction")

                if [ "$STRICT_MODE" = true ]; then
                    cd ..
                    exit $exit_code
                fi
            fi
        else
            print_dry_run "AgentCore resources for agent $AGENT_NAME"
        fi

        cd ..
    else
        print_warning "No AgentCore configuration found ($CONFIG_FILE)"
    fi
else
    print_warning "Skipping AgentCore destruction (--skip-agentcore)"
fi

# ============================================================================
# Step 3: Delete AgentCore Identity & Memory Primitives (using boto3)
# ============================================================================

if [ "$SKIP_AGENTCORE" = false ]; then
    print_header "Step 3: Deleting AgentCore Identity & Memory Primitives"

    print_info "Deleting via boto3 (better reliability than AWS CLI):"
    print_info "  • API Key Credential Provider"
    print_info "  • Workload Identity"
    print_info "  • Memory"
    echo ""

    # Build Python script arguments
    TEARDOWN_ARGS="--agent-name $AGENT_NAME --memory-name $MEMORY_NAME --region $AWS_REGION"

    # Try to get memory ID from config for faster deletion
    if [ -f "$CONFIG_FILE" ]; then
        MEMORY_ID=$(read_config_value "memory_id" "$CONFIG_FILE")
        if [ -n "$MEMORY_ID" ]; then
            TEARDOWN_ARGS="$TEARDOWN_ARGS --memory-id $MEMORY_ID"
            print_info "Using memory ID from config: $MEMORY_ID"
        fi
    fi

    # Add dry-run flag if enabled
    if [ "$DRY_RUN" = true ]; then
        TEARDOWN_ARGS="$TEARDOWN_ARGS --dry-run"
    fi

    # Call Python script
    if [ "$DRY_RUN" = false ]; then
        if python backend/scripts/teardown-agentcore-primitives.py $TEARDOWN_ARGS; then
            print_success "AgentCore primitives deleted successfully"
        else
            exit_code=$?
            print_error "AgentCore primitives deletion failed (exit code: $exit_code)"
            FAILED_OPERATIONS+=("AgentCore primitives deletion")

            if [ "$STRICT_MODE" = true ]; then
                exit $exit_code
            fi
        fi
    else
        print_dry_run "AgentCore primitives (API key, identity, memory)"
    fi
else
    print_warning "Skipping AgentCore primitives deletion (--skip-agentcore)"
fi

# ============================================================================
# Step 4: Delete CodeBuild Source S3 Bucket
# ============================================================================

if [ "$SKIP_S3" = false ]; then
    print_header "Step 4: Deleting CodeBuild Source S3 Bucket"

    if [ -f "$CONFIG_FILE" ]; then
        SOURCE_BUCKET=$(read_config_value "source_bucket" "$CONFIG_FILE")

        if [ -n "$SOURCE_BUCKET" ]; then
            print_info "Source bucket: $SOURCE_BUCKET"

            # Check if bucket exists
            if resource_exists aws s3 ls "s3://$SOURCE_BUCKET" --region "$AWS_REGION"; then
                # Empty bucket first
                if [ "$DRY_RUN" = false ]; then
                    print_step "Emptying bucket..."
                    if ! aws s3 rm "s3://$SOURCE_BUCKET" --recursive --region "$AWS_REGION" 2>/dev/null; then
                        print_warning "Failed to empty bucket (continuing...)"
                    fi
                fi

                execute_command "Delete S3 bucket $SOURCE_BUCKET" \
                    aws s3 rb "s3://$SOURCE_BUCKET" --region "$AWS_REGION"

                if [ "$?" -eq 0 ]; then
                    print_success "S3 bucket deleted"
                fi
            else
                print_warning "S3 bucket not found or already deleted"
            fi
        else
            print_warning "No source bucket found in config"
        fi
    else
        print_warning "No AgentCore configuration found ($CONFIG_FILE)"
    fi
else
    print_warning "Skipping S3 bucket deletion (--skip-s3)"
fi

# ============================================================================
# Step 5: Delete CDK Infrastructure
# ============================================================================

if [ "$SKIP_CDK" = false ]; then
    print_header "Step 5: Deleting CDK Infrastructure"

    if [ -d "infrastructure" ]; then
        cd infrastructure

        if [ "$DRY_RUN" = false ]; then
            if cdk destroy --force; then
                print_success "CDK infrastructure deleted"
            else
                print_error "CDK deletion failed"
                FAILED_OPERATIONS+=("CDK infrastructure deletion")

                if [ "$STRICT_MODE" = true ]; then
                    exit 1
                fi
            fi
        else
            print_dry_run "CDK stack $CDK_STACK_NAME"
        fi

        cd ..
    else
        print_warning "Infrastructure directory not found"
    fi
else
    print_warning "Skipping CDK deletion (--skip-cdk)"
fi

# ============================================================================
# Step 6: Delete CloudWatch Log Groups
# ============================================================================

if [ "$KEEP_LOGS" = false ]; then
    print_header "Step 6: Deleting CloudWatch Log Groups"

    # Delete AgentCore log group
    AGENTCORE_LOG_GROUP="/aws/bedrock-agentcore/$AGENT_NAME"
    if resource_exists aws logs describe-log-groups --log-group-name-prefix "$AGENTCORE_LOG_GROUP" --region "$AWS_REGION"; then
        execute_command "Delete log group $AGENTCORE_LOG_GROUP" \
            aws logs delete-log-group \
            --log-group-name "$AGENTCORE_LOG_GROUP" \
            --region "$AWS_REGION"
        print_success "AgentCore log group deleted"
    else
        print_info "AgentCore log group not found"
    fi

    # Delete Lambda log groups
    print_step "Finding Lambda log groups..."
    if [ "$DRY_RUN" = false ]; then
        LAMBDA_LOG_GROUPS=$(aws logs describe-log-groups \
            --log-group-name-prefix "/aws/lambda/$CDK_STACK_NAME" \
            --region "$AWS_REGION" \
            --query 'logGroups[].logGroupName' \
            --output text 2>/dev/null || echo "")

        if [ -n "$LAMBDA_LOG_GROUPS" ]; then
            for LOG_GROUP in $LAMBDA_LOG_GROUPS; do
                execute_command "Delete log group $LOG_GROUP" \
                    aws logs delete-log-group \
                    --log-group-name "$LOG_GROUP" \
                    --region "$AWS_REGION"
            done
            print_success "Lambda log groups deleted"
        else
            print_info "No Lambda log groups found"
        fi
    else
        print_dry_run "Lambda log groups for stack $CDK_STACK_NAME"
    fi
else
    print_warning "Skipping CloudWatch log group deletion (--keep-logs)"
fi

# ============================================================================
# Step 7: Clean Up Configuration Files
# ============================================================================

if [ "$KEEP_CONFIG" = false ]; then
    print_header "Step 7: Cleaning Up Configuration Files"

    # Delete AgentCore config file
    if [ -f "$CONFIG_FILE" ]; then
        if [ "$DRY_RUN" = false ]; then
            rm "$CONFIG_FILE"
            print_success "Deleted $CONFIG_FILE"
        else
            print_dry_run "$CONFIG_FILE"
        fi
    else
        print_info "Config file not found: $CONFIG_FILE"
    fi

    # Optionally clear CDK outputs from .env files
    print_step "Clearing CDK outputs from environment files..."

    ENV_FILES=("backend/.env" "web/.env")
    for ENV_FILE in "${ENV_FILES[@]}"; do
        if [ -f "$ENV_FILE" ]; then
            if [ "$DRY_RUN" = false ]; then
                # Create backup
                cp "$ENV_FILE" "$ENV_FILE.backup"

                # Clear CDK-populated values (set to empty)
                sed -i.tmp 's/^COGNITO_USER_POOL_ID=.*/COGNITO_USER_POOL_ID=/' "$ENV_FILE" 2>/dev/null || true
                sed -i.tmp 's/^COGNITO_CLIENT_ID=.*/COGNITO_CLIENT_ID=/' "$ENV_FILE" 2>/dev/null || true
                sed -i.tmp 's/^COGNITO_IDENTITY_POOL_ID=.*/COGNITO_IDENTITY_POOL_ID=/' "$ENV_FILE" 2>/dev/null || true
                sed -i.tmp 's/^WEBSOCKET_API_ID=.*/WEBSOCKET_API_ID=/' "$ENV_FILE" 2>/dev/null || true
                sed -i.tmp 's/^NEXT_PUBLIC_COGNITO_USER_POOL_ID=.*/NEXT_PUBLIC_COGNITO_USER_POOL_ID=/' "$ENV_FILE" 2>/dev/null || true
                sed -i.tmp 's/^NEXT_PUBLIC_COGNITO_CLIENT_ID=.*/NEXT_PUBLIC_COGNITO_CLIENT_ID=/' "$ENV_FILE" 2>/dev/null || true
                sed -i.tmp 's/^NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID=.*/NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID=/' "$ENV_FILE" 2>/dev/null || true
                sed -i.tmp 's/^NEXT_PUBLIC_WEBSOCKET_URL=.*/NEXT_PUBLIC_WEBSOCKET_URL=/' "$ENV_FILE" 2>/dev/null || true
                sed -i.tmp 's/^NEXT_PUBLIC_AGENTCORE_ARN=.*/NEXT_PUBLIC_AGENTCORE_ARN=/' "$ENV_FILE" 2>/dev/null || true
                rm "$ENV_FILE.tmp" 2>/dev/null || true

                print_info "Cleared CDK outputs from $ENV_FILE (backup: $ENV_FILE.backup)"
            else
                print_dry_run "Clear CDK outputs from $ENV_FILE"
            fi
        fi
    done

    print_success "Configuration cleanup complete"
else
    print_warning "Skipping configuration cleanup (--keep-config)"
fi

# ============================================================================
# Summary
# ============================================================================

print_header "Teardown Complete"

if [ "$DRY_RUN" = true ]; then
    echo -e "${MAGENTA}DRY RUN completed - No resources were deleted${NC}"
    echo ""
    echo -e "To actually delete resources, run without --dry-run flag"
elif [ ${#FAILED_OPERATIONS[@]} -eq 0 ]; then
    print_success "All resources have been deleted successfully!"
else
    print_warning "Teardown completed with some failures"
    echo ""
    echo -e "${YELLOW}Failed operations:${NC}"
    for operation in "${FAILED_OPERATIONS[@]}"; do
        echo -e "  • $operation"
    done
fi

echo ""
if [ "$KEEP_LOGS" = true ]; then
    print_info "CloudWatch log groups were preserved"
fi
if [ "$KEEP_CONFIG" = true ]; then
    print_info "Configuration files were preserved"
fi

if [ ${#FAILED_OPERATIONS[@]} -eq 0 ]; then
    print_info "Note: Some resources may require manual cleanup via AWS Console and also the .env files"
    echo ""
fi
