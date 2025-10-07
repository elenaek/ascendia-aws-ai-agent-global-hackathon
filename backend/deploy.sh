#!/bin/bash
# Deploy backend agent with environment variables from .env file

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Deploying Backend Agent ===${NC}"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found in backend directory${NC}"
    exit 1
fi

# Build the agentcore deploy command
DEPLOY_CMD="agentcore deploy"

# Parse .env file and append --env flags
echo -e "${BLUE}Reading environment variables from .env...${NC}"

while IFS='=' read -r key value; do
    # Skip empty lines and comments
    if [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]]; then
        continue
    fi

    # Remove leading/trailing whitespace
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)

    # Skip if key or value is empty
    if [[ -z "$key" || -z "$value" ]]; then
        continue
    fi

    # Remove quotes from value if present
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"

    echo -e "${GREEN}  ✓ ${key}${NC}"
    DEPLOY_CMD="$DEPLOY_CMD --env $key=\"$value\""
done < .env

# Execute the deploy command
echo -e "${BLUE}Executing: $DEPLOY_CMD${NC}"
eval $DEPLOY_CMD

echo -e "${GREEN}=== Deploy Complete ===${NC}"
