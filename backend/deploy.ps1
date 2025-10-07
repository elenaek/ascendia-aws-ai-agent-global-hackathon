# Deploy backend agent with environment variables from .env file

$ErrorActionPreference = "Stop"

Write-Host "=== Deploying Backend Agent ===" -ForegroundColor Blue

# Check if .env file exists
if (-Not (Test-Path ".env")) {
    Write-Host "Error: .env file not found in backend directory" -ForegroundColor Red
    exit 1
}

# Build the agentcore deploy command
$deployCmd = "agentcore deploy"

# Parse .env file and append --env flags
Write-Host "Reading environment variables from .env..." -ForegroundColor Blue

Get-Content ".env" | ForEach-Object {
    $line = $_.Trim()

    # Skip empty lines and comments
    if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith("#")) {
        return
    }

    # Split on first = only
    $parts = $line -split '=', 2

    if ($parts.Length -ne 2) {
        return
    }

    $key = $parts[0].Trim()
    $value = $parts[1].Trim()

    # Skip if key or value is empty
    if ([string]::IsNullOrWhiteSpace($key) -or [string]::IsNullOrWhiteSpace($value)) {
        return
    }

    # Remove quotes from value if present
    $value = $value.Trim('"', "'")

    Write-Host "  ✓ $key" -ForegroundColor Green

    # Escape value for command line
    $escapedValue = $value -replace '"', '\"'
    $deployCmd += " --env $key=`"$escapedValue`""
}

# Execute the deploy command
Write-Host "Executing: $deployCmd" -ForegroundColor Blue
Invoke-Expression $deployCmd

Write-Host "=== Deploy Complete ===" -ForegroundColor Green
