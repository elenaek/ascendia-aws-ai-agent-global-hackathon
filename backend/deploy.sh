#!/bin/bash
# Deploy backend agent with environment variables from .env file

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
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

# First pass: Check if ENV_VARS_TO_PACK is specified
VARS_TO_PACK=""
while IFS='=' read -r key value; do
    # Skip empty lines and comments
    if [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]]; then
        continue
    fi

    key=$(echo "$key" | xargs)

    if [[ "$key" == "ENV_VARS_TO_PACK" ]]; then
        value=$(echo "$value" | xargs)
        value="${value%\"}"
        value="${value#\"}"
        value="${value%\'}"
        value="${value#\'}"
        VARS_TO_PACK="$value"
        break
    fi
done < .env

# Parse .env file and append --env flags
if [[ -n "$VARS_TO_PACK" ]]; then
    echo -e "${YELLOW}Scoped deployment: Only packing specified variables${NC}"
    echo -e "${BLUE}Variables to pack: ${VARS_TO_PACK}${NC}"

    # Convert comma-separated list to array
    IFS=',' read -ra ALLOWED_VARS <<< "$VARS_TO_PACK"

    # Trim whitespace from each variable name
    for i in "${!ALLOWED_VARS[@]}"; do
        ALLOWED_VARS[$i]=$(echo "${ALLOWED_VARS[$i]}" | xargs)
    done
else
    echo -e "${BLUE}Reading all environment variables from .env...${NC}"
fi

# Second pass: Pack the environment variables
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

    # Skip ENV_VARS_TO_PACK itself
    if [[ "$key" == "ENV_VARS_TO_PACK" ]]; then
        continue
    fi

    # If scoping is enabled, check if this var is in the allowed list
    if [[ -n "$VARS_TO_PACK" ]]; then
        FOUND=false
        for allowed_var in "${ALLOWED_VARS[@]}"; do
            if [[ "$key" == "$allowed_var" ]]; then
                FOUND=true
                break
            fi
        done

        if [[ "$FOUND" == false ]]; then
            continue
        fi
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
echo -e "${BLUE}Executing deployment...${NC}"
eval $DEPLOY_CMD

echo -e "${GREEN}=== Deploy Complete ===${NC}"
