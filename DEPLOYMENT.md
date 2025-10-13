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
- CDK bootstrapped in your account/region:
  ```bash
  cdk bootstrap aws://ACCOUNT-ID/us-east-1
  ```

### API Keys

1. **Tavily API Key** (required)
   - Sign up at https://tavily.com
   - Get your API key from dashboard

2. **DataForSEO Credentials** (required)
   - Sign up at https://dataforseo.com
   - Base64 encode your credentials: `echo -n "username:password" | base64`

---

## Quick Start

For experienced users who have all prerequisites installed:

```bash
# 1. Clone and setup
git clone <repository-url>
cd ascendia-aws-ai-agent-global-hackathon

# 2. Configure environment
cp .env.template backend/.env
# Edit backend/.env with your values

cp web/.env.example web/.env
# Edit web/.env with your values

# 3. Deploy everything
./scripts/deploy-all.sh

# 4. Start frontend
cd web
npm install
npm run dev
```

Your application will be available at http://localhost:3000

---

## Detailed Deployment Steps

### Step 1: Environment Setup

#### 1.1 Copy Environment Templates

```bash
# Backend configuration
cp .env.template backend/.env

# Frontend configuration
cp web/.env.example web/.env
```

#### 1.2 Configure Backend Environment

Edit `backend/.env`:

```bash
# AWS Account Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012          # Your AWS account ID
AWS_ACCESS_KEY_ID=AKIA...            # Your access key
AWS_SECRET_ACCESS_KEY=...            # Your secret key

# Third-Party API Keys
TAVILY_API_KEY=tvly-...              # From tavily.com
DATA_FOR_SEO_CREDS_B64=dXNlcm5h...   # Base64 encoded credentials

# AgentCore Configuration (defaults)
MEMORY_NAME=business_analyst_memory
MAX_RECENT_TURNS=10

# CDK Outputs (populated after CDK deployment)
COGNITO_USER_POOL_ID=              # Auto-populated
COGNITO_CLIENT_ID=                 # Auto-populated
COGNITO_IDENTITY_POOL_ID=          # Auto-populated
WEBSOCKET_API_ID=                  # Auto-populated
```

#### 1.3 Validate Environment

```bash
./scripts/validate-env.sh
```

This checks:
- All required CLI tools are installed
- AWS credentials are valid
- Required environment variables are set
- Python dependencies are available
- CDK is bootstrapped

Fix any errors before proceeding.

---

### Step 2: Deploy Infrastructure

You have two options:

#### Option A: Deploy Everything (Recommended)

```bash
./scripts/deploy-all.sh
```

This master script will:
1. Validate environment
2. Deploy CDK infrastructure
3. Deploy AgentCore (memory, identity, agent)
4. Attach IAM policies
5. Update environment files with outputs

#### Option B: Deploy Step-by-Step

**2.1 Deploy CDK Infrastructure**

```bash
cd infrastructure
cdk synth              # Verify synthesis
cdk deploy             # Deploy stack
cd ..
```

This creates:
- Cognito User Pool and Identity Pool
- DynamoDB tables (Companies, Competitors, Reviews, WebSocketConnections)
- WebSocket API Gateway
- Lambda functions
- S3 bucket
- IAM policies

**2.2 Update Backend Environment**

After CDK deployment, update `backend/.env` with stack outputs:

```bash
# Get outputs from CloudFormation
aws cloudformation describe-stacks \
  --stack-name InfrastructureStack \
  --query 'Stacks[0].Outputs'

# Copy these values to backend/.env:
# - UserPoolId → COGNITO_USER_POOL_ID
# - UserPoolClientId → COGNITO_CLIENT_ID
# - IdentityPoolId → COGNITO_IDENTITY_POOL_ID
# - WebSocketApiId → WEBSOCKET_API_ID
```

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

Edit `web/.env`:

```bash
# AWS Cognito (from CDK outputs)
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
NEXT_PUBLIC_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID=us-east-1:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX

# WebSocket API (from CDK outputs)
NEXT_PUBLIC_WEBSOCKET_URL=wss://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/prod

# AgentCore (from .bedrock_agentcore.yaml)
NEXT_PUBLIC_AGENTCORE_ARN=arn:aws:bedrock-agentcore:us-east-1:XXXXXXXXXXXX:agent-runtime/XXXXXXXXXXXX

# AWS Configuration
NEXT_PUBLIC_AWS_REGION=us-east-1

# DynamoDB Tables (from CDK outputs)
NEXT_PUBLIC_COMPANIES_TABLE=InfrastructureStack-CompaniesTable-XXXXXXXXXXXX
NEXT_PUBLIC_REVIEWS_TABLE=InfrastructureStack-ReviewsTable-XXXXXXXXXXXX
NEXT_PUBLIC_COMPETITORS_TABLE=InfrastructureStack-CompetitorsTable-XXXXXXXXXXXX
NEXT_PUBLIC_COMPANY_COMPETITORS_TABLE=InfrastructureStack-CompanyCompetitorsTable-XXXXXXXXXXXX
```

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

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `AWS_REGION` | Yes | AWS region | `us-east-1` |
| `AWS_ACCOUNT_ID` | Yes | AWS account ID | `123456789012` |
| `AWS_ACCESS_KEY_ID` | Yes | AWS access key | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS secret key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `TAVILY_API_KEY` | Yes | Tavily search API key | `tvly-XXXXXXXXXX` |
| `DATA_FOR_SEO_CREDS_B64` | Yes | Base64 encoded DataForSEO creds | `dXNlcm5hbWU6cGFzc3dvcmQ=` |
| `MEMORY_NAME` | No | AgentCore memory name | `business_analyst_memory` |
| `MAX_RECENT_TURNS` | No | Conversation turns to keep | `10` |

#### Frontend (web/.env)

| Variable | Required | Description | Populated By |
|----------|----------|-------------|--------------|
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | Yes | Cognito User Pool ID | CDK deployment |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | Yes | Cognito Client ID | CDK deployment |
| `NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID` | Yes | Cognito Identity Pool ID | CDK deployment |
| `NEXT_PUBLIC_WEBSOCKET_URL` | Yes | WebSocket API URL | CDK deployment |
| `NEXT_PUBLIC_AGENTCORE_ARN` | Yes | Agent ARN | AgentCore deployment |
| `NEXT_PUBLIC_AWS_REGION` | Yes | AWS region | Manual |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│                       (Next.js Frontend)                         │
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
                                    │   - Webhook handler         │
                                    │   - WebSocket handlers      │
                                    └────────────┬────────────────┘
                                                 │
┌────────────────────────────────────────────────▼─────────────────┐
│                    AWS Bedrock AgentCore                          │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│   │   Memory     │  │   Identity   │  │   Agent Runtime      │ │
│   │   (History)  │  │   (API Keys) │  │   (Strands Agents)   │ │
│   └──────────────┘  └──────────────┘  └──────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
                                  │
                     ┌────────────┼────────────┐
                     │            │            │
              ┌──────▼─────┐ ┌───▼──────┐ ┌──▼───────┐
              │  DynamoDB  │ │  Tavily  │ │DataForSEO│
              │   Tables   │ │    API   │ │   API    │
              └────────────┘ └──────────┘ └──────────┘
```

### Data Flow

1. **User Authentication**: Cognito handles user signup/signin
2. **WebSocket Connection**: Frontend connects to API Gateway
3. **Agent Invocation**: User sends query → Lambda → AgentCore
4. **Agent Processing**:
   - Retrieves conversation history from Memory
   - Gets API keys from Identity
   - Executes business logic using tools (Tavily, DataForSEO)
   - Stores data in DynamoDB
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
| Reviews | Customer reviews | PK: `review_id` |
| WebSocketConnections | Active WebSocket connections | PK: `connectionId` |

#### API Gateway

| Resource | Type | Purpose |
|----------|------|---------|
| WebSocket API | WebSocket | Real-time communication |
| Routes | $connect, $disconnect, $default | Connection management |

#### Lambda Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| WebhookHandler | API Gateway | Processes agent webhooks |
| ConnectHandler | WebSocket $connect | Manages connections |
| DisconnectHandler | WebSocket $disconnect | Cleans up connections |

#### IAM Policies

| Policy | Attached To | Permissions |
|--------|-------------|-------------|
| AgentCoreSecretsAccessPolicy | AgentCore Execution Role | SSM, DynamoDB, WebSocket API |

---

## Post-Deployment

### Verify Deployment

**1. Test AgentCore Agent**

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

**2. Check CloudWatch Logs**

```bash
aws logs tail /aws/bedrock-agentcore/business_analyst --follow
```

**3. Test WebSocket Connection**

```bash
# Install wscat if needed
npm install -g wscat

# Connect to WebSocket
wscat -c wss://YOUR_WEBSOCKET_ID.execute-api.us-east-1.amazonaws.com/prod

# Send test message
> {"action": "test", "data": "hello"}
```

**4. Test Frontend**

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

**Error**: `CDK bootstrap required`

**Solution**: Bootstrap CDK in your account/region:

```bash
cdk bootstrap aws://ACCOUNT_ID/us-east-1
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
2. **Enable S3 Lifecycle Policies**: Archive old reviews to Glacier
3. **Set CloudWatch Log Retention**: Default is indefinite
   ```bash
   aws logs put-retention-policy \
     --log-group-name /aws/bedrock-agentcore/business_analyst \
     --retention-in-days 7
   ```
4. **Monitor Costs**: Set up AWS Budgets with alerts

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

**Deployment Version**: 1.0.0
**Last Updated**: 2025-01-12
**Tested With**: AgentCore Preview, CDK 2.x, Python 3.11
