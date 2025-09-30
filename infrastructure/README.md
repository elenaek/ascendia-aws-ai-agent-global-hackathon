# Infrastructure Deployment Guide

## Prerequisites

- AWS CLI configured with appropriate credentials
- Python 3.12 installed
- Pipenv installed
- Node.js installed (for CDK CLI)
- AWS CDK installed (`npm install -g aws-cdk`)

## Setup

1. Navigate to infrastructure directory:
```bash
cd infrastructure
```

2. Install dependencies using Pipenv:
```bash
pipenv install
```

3. Activate Pipenv shell:
```bash
pipenv shell
```

## Deployment

1. Bootstrap CDK (first time only):
```bash
cdk bootstrap
```

2. Synthesize the CloudFormation template:
```bash
cdk synth
```

3. Deploy the stack:
```bash
cdk deploy
```

## Stack Components

- **Lambda Function**: Webhook handler located in `lambda/webhook.py`
- **API Gateway**: REST API with POST endpoint at `/webhook`
- **CloudWatch Logs**: 7-day retention for Lambda logs

## Webhook Endpoint

After deployment, the webhook URL will be displayed as an output:
- Format: `https://{api-id}.execute-api.{region}.amazonaws.com/prod/webhook`

## Lambda Function Features

The webhook handler includes:
- JSON request body parsing
- Header extraction and logging
- Error handling with appropriate HTTP responses
- Extensible webhook processing based on source
- CORS headers enabled

## Testing

Send a POST request to the webhook endpoint:
```bash
curl -X POST https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## Cleanup

To remove all deployed resources:
```bash
cdk destroy
```