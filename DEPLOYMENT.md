# AWS Hackathon Stack - Deployment Guide

Complete deployment guide for the AWS Bedrock AgentCore business analyst application.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Deployment Steps](#detailed-deployment-steps)
- [Configuration Reference](#configuration-reference)
- [Architecture Overview](#architecture-overview)
- [Deployed Resources](#deployed-resources)
- [Post-Deployment](#post-deployment)
- [Troubleshooting](#troubleshooting)
- [Cleanup](#cleanup)

---

## Overview

This stack deploys a complete AWS-powered business intelligence application featuring:

- **AWS Bedrock AgentCore**: AI agent runtime with memory and identity management
- **CDK Infrastructure**: Cognito, DynamoDB, Lambda, WebSocket API
- **Frontend**: Next.js web application with real-time updates
- **Backend**: Python-based agent using Strands framework

**Deployment Time**: 10-15 minutes

**Estimated Costs**:
- AgentCore: Pay-per-use (preview pricing TBD)
- CDK Resources: ~$5-20/month (depending on usage)
- Cognito: Free tier eligible
- DynamoDB: On-demand pricing

---

## Prerequisites

### Required Tools

| Tool | Minimum Version | Installation |
|------|----------------|--------------|
| AWS CLI | 2.x | `aws --version` |
| Python | 3.9+ | `python3 --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| AWS CDK | 2.x | `npm install -g aws-cdk` |
| AgentCore CLI | Latest | [bedrock-agentcore-starter-toolkit](https://github.com/aws-samples/bedrock-agentcore-starter-toolkit) |

### AWS Account Requirements

- AWS Account with Administrator access
- AWS region: `us-east-1` (required for AgentCore preview)
- CDK will be automatically bootstrapped by the deployment script if needed

### API Keys

1. **Tavily API Key** (required)
   - Sign up at https://tavily.com
   - Get your API key from dashboard

### AWS Bedrock Model Access (REQUIRED - Manual Step)

**⚠️ IMPORTANT**: Before deploying, you **must** enable access to AWS Bedrock foundation models through the AWS Console. This **cannot** be done programmatically.

#### Required Models

This application requires access to:
- **Amazon Nova Pro** (`us.amazon.nova-pro-v1:0`) - Primary model for business analysis

#### How to Enable Model Access

1. **Open the AWS Bedrock Console**:
   - Navigate to https://console.aws.amazon.com/bedrock/
   - Or search for "Bedrock" in the AWS Console

2. **Go to Model Access**:
   - In the left sidebar, under "Bedrock configurations", click **Model access**

3. **Enable Required Models**:
   - Click **Modify model access**
   - Find "Amazon Nova Pro" in the list
   - Check the box next to it
   - Optionally enable "Amazon Nova Premier" if you plan to use it
   - Review the End User License Agreement (EULA)

4. **Submit Request**:
   - Click **Next**
   - Review your selections
   - Click **Submit**

5. **Wait for Access** (usually instant):
   - For Amazon models (Nova), access is typically granted immediately
   - Changes may take a few minutes to propagate

#### Verify Model Access

After enabling, verify access with the included script:

```bash
python scripts/check-bedrock-models.py --region us-east-1
```

This check is also performed automatically during `./scripts/validate-env.sh`.

**Direct Link**: Replace `us-east-1` with your region:
```
https://console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess
```

---

## Quick Start

For experienced users who have all prerequisites installed:

```bash
# 1. Clone repository
git clone <repository-url>
cd ascendia-aws-ai-agent-global-hackathon

# 2. Deploy everything with full automation
./scripts/deploy-all.sh

# The script will automatically:
# - Prompt for environment setup if .env files don't exist
# - Auto-detect your AWS account from AWS CLI
# - Validate your environment and prerequisites
# - Bootstrap CDK if needed
# - Deploy CDK infrastructure (Cognito, DynamoDB, Lambda, WebSocket API)
# - Deploy AgentCore primitives (Memory, Identity, Agent Runtime)
# - Attach IAM policies for permissions
# - Update all .env files with deployment outputs

# 3. Start frontend
cd web
npm install
npm run dev
```

Your application will be available at http://localhost:3000

**Note:** The deployment is fully automated. If .env files are missing, the script will interactively prompt you for required values (AWS credentials, Tavily API key). All other configuration values are automatically populated from deployment outputs.

---

## Detailed Deployment Steps

### Step 1: Environment Setup

#### Option A: Automatic Setup via deploy-all.sh (Recommended)

The `deploy-all.sh` script automatically handles environment setup:

```bash
./scripts/deploy-all.sh
```

**What happens:**
- If `.env` files are missing, the script automatically runs interactive setup
- ✓ Auto-detects your AWS account ID from AWS CLI
- ✓ Prompts for required configuration (AWS credentials, Tavily API key)
- ✓ Creates both `backend/.env` and `web/.env` automatically
- ✓ Uses sensible defaults for optional settings
- ✓ Validates your inputs
- ✓ After deployment, automatically populates all CDK outputs and AgentCore ARN

**No separate setup step needed!** Just run `deploy-all.sh` and follow the prompts.

#### Option B: Interactive Setup Script (Alternative)

If you want to set up environment files before deployment:

```bash
./scripts/setup-env.sh
```

This creates the `.env` files with your AWS credentials and API keys. Deployment outputs will be populated later by `deploy-all.sh`.

#### Option C: Manual Setup

If you prefer complete manual configuration:

1. Copy environment templates:
```bash
cp .env.template backend/.env
cp web/.env.template web/.env
```

2. Edit `backend/.env` with your values (use `.env.template` as reference):
```bash
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
TAVILY_API_KEY=tvly-...
```

**Note:** CDK outputs (Cognito, WebSocket, DynamoDB) and AgentCore ARN will need to be manually copied after deployment if not using `deploy-all.sh`.

#### 1.2 Validate Environment

```bash
./scripts/validate-env.sh
```

This checks:
- ✓ Environment files exist
- ✓ All required CLI tools are installed
- ✓ AWS credentials are valid
- ✓ Required environment variables are set
- ✓ Python dependencies are available
- ✓ CDK is bootstrapped

Fix any errors before proceeding.

---

### Step 2: Deploy Infrastructure

You have two options:

#### Option A: Deploy Everything (Recommended)

```bash
./scripts/deploy-all.sh
```

This master script handles the complete deployment process:
1. ✓ **Environment Setup**: Interactive prompts if .env files are missing
2. ✓ **Validation**: Checks prerequisites and environment configuration
3. ✓ **CDK Bootstrap**: Automatically bootstraps CDK if needed
4. ✓ **CDK Deployment**: Deploys Cognito, DynamoDB, Lambda, WebSocket API
5. ✓ **AgentCore Deployment**: Creates Memory, Identity, and Agent Runtime
6. ✓ **IAM Configuration**: Attaches policies for agent permissions
7. ✓ **Auto-Configuration**: Updates both `backend/.env` and `web/.env` with all outputs

**Partial Deployment Options:**

If you need to skip certain steps, use these flags:

```bash
# Skip environment validation
./scripts/deploy-all.sh --skip-validation

# Skip CDK deployment (if already deployed)
./scripts/deploy-all.sh --skip-cdk

# Skip AgentCore deployment (if already deployed)
./scripts/deploy-all.sh --skip-agentcore

# Skip IAM policy attachment
./scripts/deploy-all.sh --skip-iam

# Combine multiple flags
./scripts/deploy-all.sh --skip-validation --skip-cdk
```

**Idempotent Deployment:**
- First run: Creates all resources from scratch
- Subsequent runs: Updates changed resources, reuses existing ones
- Safe to re-run: Won't create duplicates

#### Option B: Deploy Step-by-Step

**⚠️ Note:** This manual approach requires manually updating `.env` files. Using `deploy-all.sh` (Option A) is strongly recommended as it automatically handles all configuration updates.

**2.1 Deploy CDK Infrastructure**

```bash
cd infrastructure

# Check if CDK is bootstrapped, bootstrap if needed
if ! aws cloudformation describe-stacks --stack-name CDKToolkit &> /dev/null; then
    echo "Bootstrapping CDK..."
    cdk bootstrap
fi

cdk synth              # Verify synthesis
cdk deploy             # Deploy stack
cd ..
```

This creates:
- Cognito User Pool and Identity Pool
- DynamoDB tables (Companies, Competitors, CompanyCompetitors, WebSocketConnections)
- WebSocket API Gateway
- Lambda functions
- IAM policies

**2.2 Update Backend Environment** *(Manual Step - Automated by deploy-all.sh)*

After CDK deployment, manually update `backend/.env` with stack outputs:

```bash
# Get outputs from CloudFormation
aws cloudformation describe-stacks \
  --stack-name InfrastructureStack \
  --query 'Stacks[0].Outputs'

# Manually copy these values to backend/.env:
# - UserPoolId → COGNITO_USER_POOL_ID
# - UserPoolClientId → COGNITO_CLIENT_ID
# - IdentityPoolId → COGNITO_IDENTITY_POOL_ID
# - WebSocketApiId → WEBSOCKET_API_ID
# - CompaniesTableName → DYNAMODB_COMPANIES_TABLE
# - CompetitorsTableName → DYNAMODB_COMPETITORS_TABLE
# - CompanyCompetitorsTableName → DYNAMODB_COMPANY_COMPETITORS_TABLE
```

**💡 Tip:** If using `deploy-all.sh`, this step is automatic via `sed` commands in the script.

**2.3 Deploy AgentCore**

```bash
cd backend
python3 scripts/deploy-agentcore.py
cd ..
```

This creates:
- AgentCore Memory (conversation history storage)
- AgentCore Identity (API key management)
- AgentCore Agent (AI agent runtime)

Configuration is saved to `backend/.bedrock_agentcore.yaml`.

**2.4 Attach IAM Policies**

```bash
cd backend
python3 scripts/attach-iam-policy.py
cd ..
```

This grants the agent permissions to:
- Access SSM parameters (Tavily API key)
- Read/write DynamoDB tables
- Send WebSocket messages

---

### Step 3: Configure Frontend

#### 3.1 Update Frontend Environment

**✅ Automatic with deploy-all.sh:** If you used `deploy-all.sh`, your `web/.env` is already configured with all values. Skip to Step 3.2.

**Manual Configuration (if not using deploy-all.sh):**

Edit `web/.env` with the following values:

```bash
# AWS Configuration
NEXT_PUBLIC_AWS_REGION=us-east-1

# AWS Cognito (from CDK outputs)
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
NEXT_PUBLIC_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID=us-east-1:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX

# WebSocket API (from CDK outputs)
NEXT_PUBLIC_WEBSOCKET_URL=wss://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/prod

# AgentCore (from backend/.bedrock_agentcore.yaml)
NEXT_PUBLIC_AGENTCORE_ARN=arn:aws:bedrock-agentcore:us-east-1:XXXXXXXXXXXX:agent-runtime/XXXXXXXXXXXX

# DynamoDB Tables (from CDK outputs)
DYNAMODB_COMPANIES_TABLE=InfrastructureStack-CompaniesTable-XXXXXXXXXXXX
DYNAMODB_COMPETITORS_TABLE=InfrastructureStack-CompetitorsTable-XXXXXXXXXXXX
DYNAMODB_COMPANY_COMPETITORS_TABLE=InfrastructureStack-CompanyCompetitorsTable-XXXXXXXXXXXX
```

**Where to find these values:**
- Cognito/WebSocket/DynamoDB: From CloudFormation stack outputs
- AgentCore ARN: From `backend/.bedrock_agentcore.yaml` file

#### 3.2 Install Dependencies

```bash
cd web
npm install
```

#### 3.3 Start Development Server

```bash
npm run dev
```

Access at: http://localhost:3000

---

## Configuration Reference

### Environment Variables

#### Backend (backend/.env)

| Variable | Required | Description | Example | How Populated |
|----------|----------|-------------|---------|---------------|
| `AWS_REGION` | Yes | AWS region | `us-east-1` | Interactive setup or manual |
| `AWS_ACCOUNT_ID` | Yes | AWS account ID | `123456789012` | Auto-detected by setup script |
| `AWS_ACCESS_KEY_ID` | Yes* | AWS access key | `AKIAIOSFODNN7EXAMPLE` | Interactive setup or manual |
| `AWS_SECRET_ACCESS_KEY` | Yes* | AWS secret key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` | Interactive setup or manual |
| `TAVILY_API_KEY` | Yes | Tavily search API key | `tvly-XXXXXXXXXX` | Interactive setup or manual |
| `MEMORY_NAME` | No | AgentCore memory name | `business_analyst_memory` | Default value in template |
| `MAX_RECENT_TURNS` | No | Conversation turns to keep | `10` | Default value in template |
| `COGNITO_USER_POOL_ID` | Yes | Cognito User Pool ID | `us-east-1_XXXXXXXXX` | **Auto-populated by deploy-all.sh** |
| `COGNITO_CLIENT_ID` | Yes | Cognito Client ID | `XXXXXXXXXXXXXXXXXX` | **Auto-populated by deploy-all.sh** |
| `COGNITO_IDENTITY_POOL_ID` | Yes | Cognito Identity Pool ID | `us-east-1:XXXXXXXX...` | **Auto-populated by deploy-all.sh** |
| `WEBSOCKET_API_ID` | Yes | WebSocket API ID | `XXXXXXXXXX` | **Auto-populated by deploy-all.sh** |

*AWS credentials are optional if using AWS CLI configured credentials

#### Frontend (web/.env)

| Variable | Required | Description | How Populated |
|----------|----------|-------------|---------------|
| `NEXT_PUBLIC_AWS_REGION` | Yes | AWS region | Interactive setup or manual |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | Yes | Cognito User Pool ID | **Auto-populated by deploy-all.sh** |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | Yes | Cognito Client ID | **Auto-populated by deploy-all.sh** |
| `NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID` | Yes | Cognito Identity Pool ID | **Auto-populated by deploy-all.sh** |
| `NEXT_PUBLIC_WEBSOCKET_URL` | Yes | WebSocket API URL | **Auto-populated by deploy-all.sh** |
| `NEXT_PUBLIC_AGENTCORE_ARN` | Yes | Agent ARN | **Auto-populated by deploy-all.sh** |
| `DYNAMODB_COMPANIES_TABLE` | Yes | Companies table name | **Auto-populated by deploy-all.sh** |
| `DYNAMODB_COMPETITORS_TABLE` | Yes | Competitors table name | **Auto-populated by deploy-all.sh** |
| `DYNAMODB_COMPANY_COMPETITORS_TABLE` | Yes | Company-competitor junction table | **Auto-populated by deploy-all.sh** |
| `ALLOWED_IPS` | No | IP whitelist for middleware | Manual (optional) |

**Note:** All values marked as "Auto-populated by deploy-all.sh" are automatically filled after successful deployment. Manual configuration is only needed if deploying step-by-step without using the master script.

---

## Architecture Overview

> **📊 For detailed architecture diagrams** including system architecture, agent-driven UI flow, data flow, and agent tools/swarm architecture, see the [README.md Architecture section](./README.md#%EF%B8%8F-architecture). The README contains comprehensive Mermaid diagrams showing the complete system.

**Simplified Overview:**

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                            │
│                       (Next.js Frontend)                        │
└────────────┬──────────────────────────────────┬─────────────────┘
             │                                   │
             │ REST                              │ WebSocket
             │                                   │
┌────────────▼──────────────┐     ┌─────────────▼────────────────┐
│   AWS Cognito             │     │   WebSocket API Gateway      │
│   - User Pool             │     │   - Real-time updates        │
│   - Identity Pool         │     │   - Connection management    │
└───────────────────────────┘     └─────────────┬────────────────┘
                                                 │
                                    ┌────────────▼────────────────┐
                                    │   Lambda Functions          │
                                    │   - WebSocket handlers      │
                                    └────────────┬────────────────┘
                                                 │
┌────────────────────────────────────────────────▼─────────────────┐
│                    AWS Bedrock AgentCore                         │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   |
│   │   Memory     │  │   Identity   │  │   Agent Runtime      │   │
│   │   (History)  │  │   (API Keys) │  │   (Strands Agents)   │   │
│   └──────────────┘  └──────────────┘  └──────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                                  │
                     ┌────────────┴────────────┐
                     │                         │
              ┌──────▼─────┐           ┌──────▼──────┐
              │  DynamoDB  │           │   Tavily    │
              │   Table    │           │     API     │
              └────────────┘           └─────────────┘
```

### Data Flow

1. **User Authentication**: Cognito handles user signup/signin
2. **WebSocket Connection**: Frontend connects to API Gateway
3. **Agent Invocation**: User sends query → Lambda → AgentCore
4. **Agent Processing**:
   - Retrieves conversation history from Memory
   - Gets API keys from Agentcore Identity credentials provider
   - Executes business logic using tools (Tavily)
   - Identify user websocket connection in DynamoDB table
   - Sends updates via WebSocket
5. **Real-time Updates**: Frontend receives and displays results

---

## Deployed Resources

### AWS Bedrock AgentCore

| Resource | Name | Description |
|----------|------|-------------|
| Memory | `business_analyst_memory` | Stores conversation history |
| Identity | `business_analyst` | Manages API keys and credentials |
| Agent | `business_analyst` | AI agent runtime |

### CDK Stack (InfrastructureStack)

#### Cognito

| Resource | Purpose |
|----------|---------|
| User Pool | User authentication |
| User Pool Client | Frontend authentication |
| Identity Pool | AWS credential vending |

#### DynamoDB Tables

| Table | Purpose | Key Structure |
|-------|---------|---------------|
| Companies | Company data | PK: `company_id` |
| Competitors | Competitor data | PK: `competitor_id` |
| CompanyCompetitors | Company-competitor relationships | PK: `company_id`, SK: `competitor_id` |
| WebSocketConnections | Active WebSocket connections | PK: `connectionId` |

#### API Gateway

| Resource | Type | Purpose |
|----------|------|---------|
| WebSocket API | WebSocket | Real-time communication |
| Routes | $connect, $disconnect, $default | Connection management |

#### Lambda Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| ConnectHandler | WebSocket $connect | Manages connections |
| DisconnectHandler | WebSocket $disconnect | Cleans up connections |

#### IAM Policies

| Policy | Attached To | Permissions |
|--------|-------------|-------------|
| AgentCoreSecretsAccessPolicy | AgentCore Execution Role | SSM, DynamoDB, WebSocket API |

---

## Post-Deployment

### Verify Deployment

**1. Verify Environment Configuration**

Check that `.env` files were properly populated by deploy-all.sh:

```bash
# Verify backend configuration
grep -E "COGNITO_USER_POOL_ID|WEBSOCKET_API_ID" backend/.env

# Verify frontend configuration
grep -E "NEXT_PUBLIC_COGNITO_USER_POOL_ID|NEXT_PUBLIC_AGENTCORE_ARN|DYNAMODB_COMPANIES_TABLE" web/.env
```

All values should be populated (not empty). If any are empty, check the deployment logs.

**2. Test AgentCore Agent**

```bash
cd backend
agentcore invoke '{"prompt": "Hello! Who are you?"}'
```

Expected output:
```json
{
  "response": "I'm your business analyst assistant...",
  "status": "success"
}
```

**3. Check CloudWatch Logs**

```bash
aws logs tail /aws/bedrock-agentcore/business_analyst --follow
```

**4. Test WebSocket Connection**

```bash
# Install wscat if needed
npm install -g wscat

# Get WebSocket URL from .env
WEBSOCKET_URL=$(grep NEXT_PUBLIC_WEBSOCKET_URL web/.env | cut -d= -f2)

# Connect to WebSocket
wscat -c $WEBSOCKET_URL

# Send test message
> {"action": "test", "data": "hello"}
```

**5. Test Frontend**

1. Open http://localhost:3000
2. Sign up for a new account
3. Verify Cognito user created
4. Send a test message to the agent
5. Verify real-time updates work

### Monitoring

**CloudWatch Logs**

- AgentCore Agent: `/aws/bedrock-agentcore/business_analyst`
- Lambda Functions: `/aws/lambda/InfrastructureStack-*`
- WebSocket API: `/aws/apigateway/InfrastructureStack-*`

**CloudWatch Metrics**

- AgentCore: `AWS/BedrockAgentCore`
- DynamoDB: `AWS/DynamoDB`
- Lambda: `AWS/Lambda`
- API Gateway: `AWS/ApiGateway`

**Cost Tracking**

```bash
# View current month costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE
```

---

## Troubleshooting

### Common Issues

#### Environment Files Not Populated

**Issue**: After running `deploy-all.sh`, `.env` files have empty values

**Solution**: Check the deployment script output for errors. Common causes:
- CloudFormation stack outputs not available
- Stack name mismatch (should be `InfrastructureStack`)
- Permission issues reading stack outputs

Manually populate values:
```bash
# Get all stack outputs
aws cloudformation describe-stacks --stack-name InfrastructureStack \
  --query 'Stacks[0].Outputs' --output table
```

Then copy values to `.env` files as described in Configuration Reference.

---

#### Partial Deployment Needed

**Issue**: Need to re-run only specific deployment steps

**Solution**: Use skip flags:

```bash
# Re-deploy only AgentCore (skip CDK and validation)
./scripts/deploy-all.sh --skip-validation --skip-cdk

# Re-attach IAM policies only
./scripts/deploy-all.sh --skip-validation --skip-cdk --skip-agentcore

# Complete re-deployment of infrastructure (skip AgentCore)
./scripts/deploy-all.sh --skip-agentcore
```

---

#### AgentCore Deployment Fails

**Error**: `AgentCore not found in region`

**Solution**: Ensure you're using `us-east-1` (AgentCore is in preview and only available in limited regions)

```bash
export AWS_REGION=us-east-1
```

---

#### IAM Policy Attachment Fails

**Error**: `Access denied when attaching policy`

**Solution**: Ensure your AWS user has `iam:AttachRolePolicy` permission:

```bash
aws iam attach-user-policy \
  --user-name YOUR_USERNAME \
  --policy-arn arn:aws:iam::aws:policy/IAMFullAccess
```

---

#### CDK Deployment Fails

**Error**: `CDK bootstrap required` or bootstrap-related errors

**Note**: The `deploy-all.sh` script automatically checks and bootstraps CDK if needed. This error typically means:
- Manual deployment was attempted without bootstrapping
- Bootstrap failed due to permission issues
- Multiple AWS profiles causing confusion

**Solution**:

1. If using `deploy-all.sh`, check you have correct AWS credentials:
```bash
aws sts get-caller-identity
```

2. If deploying manually, bootstrap CDK explicitly:
```bash
cd infrastructure
cdk bootstrap
# Or with explicit account/region:
cdk bootstrap aws://ACCOUNT_ID/us-east-1
```

3. Verify bootstrap stack exists:
```bash
aws cloudformation describe-stacks --stack-name CDKToolkit
```

---

#### Agent Can't Access DynamoDB

**Error**: `AccessDeniedException` in CloudWatch logs

**Solution**: Re-run IAM policy attachment:

```bash
cd backend
python3 scripts/attach-iam-policy.py
```

Verify policy is attached:

```bash
# Get execution role name from .bedrock_agentcore.yaml
ROLE_NAME=$(grep execution_role backend/.bedrock_agentcore.yaml | awk -F'/' '{print $NF}')

# List attached policies
aws iam list-attached-role-policies --role-name "$ROLE_NAME"
```

---

#### WebSocket Connection Fails

**Error**: `Failed to connect to WebSocket`

**Checklist**:
1. Verify WebSocket URL in `web/.env`:
   ```bash
   aws cloudformation describe-stacks \
     --stack-name InfrastructureStack \
     --query 'Stacks[0].Outputs[?OutputKey==`WebSocketApiUrl`].OutputValue' \
     --output text
   ```

2. Check WebSocket API stage:
   ```bash
   aws apigatewayv2 get-stages --api-id YOUR_API_ID
   ```

3. Verify Lambda functions exist:
   ```bash
   aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `InfrastructureStack`)].FunctionName'
   ```

---

#### Frontend Authentication Fails

**Error**: `User does not exist` or `InvalidParameterException`

**Solution**: Verify Cognito configuration in `web/.env`:

```bash
# Get Cognito outputs
aws cloudformation describe-stacks \
  --stack-name InfrastructureStack \
  --query 'Stacks[0].Outputs[?contains(OutputKey, `Cognito`)].[OutputKey,OutputValue]' \
  --output table
```

---

### Debug Mode

Enable verbose logging:

**Backend**

```bash
# Add to backend/.env
DEBUG=true
LOG_LEVEL=DEBUG
```

**AgentCore**

```bash
# View detailed agent logs
aws logs tail /aws/bedrock-agentcore/business_analyst \
  --follow \
  --format detailed \
  --filter-pattern "ERROR"
```

**CDK**

```bash
# Verbose CDK output
cdk deploy --verbose
```

---

## Cleanup

### Complete Teardown

Remove all resources:

```bash
./scripts/teardown-all.sh
```

This script will:
1. Delete AgentCore agent
2. Delete AgentCore memory
3. Delete AgentCore identity
4. Destroy CDK infrastructure

**Warning**: This action cannot be undone. All data will be lost.

### Partial Cleanup

**Delete only AgentCore (keep infrastructure)**

```bash
# Delete agent
AGENT_ID=$(grep agent_id backend/.bedrock_agentcore.yaml | awk '{print $2}')
aws bedrock-agentcore-control delete-agent-runtime --agent-runtime-id "$AGENT_ID"

# Delete identity
aws bedrock-agentcore-control delete-workload-identity --name business_analyst
```

**Delete only CDK (keep AgentCore)**

```bash
cd infrastructure
cdk destroy
cd ..
```

### Manual Cleanup

If automated teardown fails, manually delete:

1. **AgentCore Resources** (AWS Console → Bedrock → AgentCore)
   - Agent runtime
   - Memory
   - Identity

2. **CloudFormation Stack** (AWS Console → CloudFormation)
   - Delete `InfrastructureStack`

3. **S3 Buckets** (if CDK delete fails)
   ```bash
   # Empty bucket first
   aws s3 rm s3://BUCKET_NAME --recursive

   # Delete bucket
   aws s3 rb s3://BUCKET_NAME
   ```

4. **CloudWatch Logs**
   ```bash
   # List log groups
   aws logs describe-log-groups --query 'logGroups[?starts_with(logGroupName, `/aws/`)].logGroupName'

   # Delete log groups
   aws logs delete-log-group --log-group-name /aws/bedrock-agentcore/business_analyst
   ```

---

## Additional Resources

### Documentation

- [AWS Bedrock AgentCore Documentation](https://docs.aws.amazon.com/bedrock/latest/agentcore/)
- [bedrock-agentcore-starter-toolkit](https://github.com/aws-samples/bedrock-agentcore-starter-toolkit)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Strands Agents Framework](https://github.com/anthropics/strands)

### Support

- GitHub Issues: [Repository Issues](https://github.com/YOUR_REPO/issues)
- AWS Support: [AWS Support Center](https://console.aws.amazon.com/support/)

### Cost Optimization

1. **Use DynamoDB On-Demand**: Already configured (scales automatically)
2. **Set CloudWatch Log Retention**: Default is indefinite
   ```bash
   aws logs put-retention-policy \
     --log-group-name /aws/bedrock-agentcore/business_analyst \
     --retention-in-days 7
   ```
3. **Monitor Costs**: Set up AWS Budgets with alerts

---

## Next Steps

After successful deployment:

1. **Customize the Agent**: Edit `backend/main.py` to add custom tools and logic
2. **Add Authentication**: Implement proper user authentication in frontend
3. **Configure Monitoring**: Set up CloudWatch dashboards and alarms
4. **Implement CI/CD**: Automate deployment using GitHub Actions or AWS CodePipeline
5. **Scale Infrastructure**: Adjust DynamoDB provisioned capacity or Lambda concurrency
6. **Add Tests**: Write unit and integration tests for agent logic

---

**Tested With**: AgentCore Preview, CDK 2.x, Python 3.11, Node.js 18+
**Key Changes**: Fully automated deployment with environment configuration, skip flags, and comprehensive error handling
