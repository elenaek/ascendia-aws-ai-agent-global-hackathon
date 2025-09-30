#!/bin/bash
# CDK deployment script with automatic shared directory management

set -e  # Exit on error

echo "📦 Copying shared directory to lambda..."
cp -r ../shared lambda/

# Trap to ensure cleanup happens even if deployment fails
cleanup() {
    echo "🧹 Cleaning up shared directory from lambda..."
    rm -rf lambda/shared
    echo "✨ Cleanup complete"
}
trap cleanup EXIT

echo "🚀 Deploying CDK stack..."
cdk deploy "$@"

echo "✅ Deployment complete!"
