# ============================================================================
# Backend Agent Deployment Script (PowerShell)
# ============================================================================
# Simplified deployment script that uses Python scripts for AgentCore deployment
#
# Usage: .\backend\deploy.ps1 [-AgentOnly] [-WithIAM]
# ============================================================================

$ErrorActionPreference = "Stop"

# Parse parameters
param(
    [switch]$AgentOnly,
    [switch]$WithIAM
)

Write-Host "`n=== Deploying Backend Agent ===" -ForegroundColor Blue
Write-Host ""

# Check if .env file exists
if (-Not (Test-Path ".env")) {
    Write-Host "Error: .env file not found in backend directory" -ForegroundColor Red
    Write-Host "Tip: Copy .env.template and fill in required values" -ForegroundColor Yellow
    exit 1
}

# Deploy AgentCore using Python script
Write-Host "Using programmatic deployment via Python scripts..." -ForegroundColor Blue
Write-Host ""

try {
    if ($AgentOnly) {
        Write-Host "Deploying agent only (skipping memory and identity)" -ForegroundColor Yellow
        python3 scripts/deploy-agentcore.py --skip-memory --skip-identity
    } else {
        Write-Host "Deploying all AgentCore components (memory, identity, agent)" -ForegroundColor Blue
        python3 scripts/deploy-agentcore.py
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Deployment failed" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "✓ Agent deployed successfully" -ForegroundColor Green
    Write-Host ""

    # Attach IAM policy if requested
    if ($WithIAM) {
        Write-Host "Attaching IAM policy to agent execution role..." -ForegroundColor Blue
        python3 scripts/attach-iam-policy.py

        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠ IAM policy attachment failed (you may need to attach manually)" -ForegroundColor Yellow
        } else {
            Write-Host "✓ IAM policy attached" -ForegroundColor Green
        }
    }

    Write-Host ""
    Write-Host "=== Deployment Complete ===" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Green
    Write-Host "  1. Test your agent: " -NoNewline
    Write-Host "agentcore invoke '{`"prompt`": `"Hello!`"}'" -ForegroundColor Blue
    Write-Host "  2. View logs: Check CloudWatch Logs for your agent"
    Write-Host "  3. Update frontend .env with agent ARN from " -NoNewline
    Write-Host ".bedrock_agentcore.yaml" -ForegroundColor Blue
    Write-Host ""

} catch {
    Write-Host "Error during deployment: $_" -ForegroundColor Red
    exit 1
}
