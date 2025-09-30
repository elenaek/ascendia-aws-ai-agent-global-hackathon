# CDK deployment script for Windows with automatic shared directory management

Write-Host "Copying shared directory to lambda..." -ForegroundColor Cyan
Copy-Item -Path "../shared" -Destination "lambda/" -Recurse -Force

try {
    Write-Host "Deploying CDK stack..." -ForegroundColor Cyan
    cdk deploy $args
    Write-Host "Deployment complete!" -ForegroundColor Green
}
finally {
    Write-Host "Cleaning up shared directory from lambda..." -ForegroundColor Cyan
    Remove-Item -Path "lambda/shared" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Cleanup complete!" -ForegroundColor Green
}
