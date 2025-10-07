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

# First pass: Check if ENV_VARS_TO_PACK is specified
$varsToPack = $null
$allowedVars = @()

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

    if ($key -eq "ENV_VARS_TO_PACK") {
        $value = $parts[1].Trim().Trim('"', "'")
        $varsToPack = $value

        # Split by comma and trim each var name
        $allowedVars = $varsToPack -split ',' | ForEach-Object { $_.Trim() }
        return
    }
}

# Parse .env file and append --env flags
if ($varsToPack) {
    Write-Host "Scoped deployment: Only packing specified variables" -ForegroundColor Yellow
    Write-Host "Variables to pack: $varsToPack" -ForegroundColor Blue
} else {
    Write-Host "Reading all environment variables from .env..." -ForegroundColor Blue
}

# Second pass: Pack the environment variables
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

    # Skip ENV_VARS_TO_PACK itself
    if ($key -eq "ENV_VARS_TO_PACK") {
        return
    }

    # If scoping is enabled, check if this var is in the allowed list
    if ($varsToPack -and -not ($allowedVars -contains $key)) {
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
Write-Host "Executing deployment..." -ForegroundColor Blue
Invoke-Expression $deployCmd

Write-Host "=== Deploy Complete ===" -ForegroundColor Green
