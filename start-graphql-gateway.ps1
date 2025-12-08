# Start GraphQL Gateway
Write-Host "Starting GraphQL Gateway..." -ForegroundColor Cyan

# Change to adc-gateway directory
Set-Location -Path $PSScriptRoot\adc-gateway

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Start the gateway
Write-Host "Starting gateway on port 5008..." -ForegroundColor Green
npm run dev
