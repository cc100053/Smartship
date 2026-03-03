# run-backend.ps1
# Loads environment variables from .env and starts the Spring Boot backend

$envFile = Join-Path $PSScriptRoot ".env"

if (-Not (Test-Path $envFile)) {
    Write-Error ".env file not found at $envFile. Please copy .env.example to .env and fill in your credentials."
    exit 1
}

Write-Host "Loading environment variables from .env..." -ForegroundColor Cyan

Get-Content $envFile | ForEach-Object {
    # Skip empty lines and comments
    if ($_ -match '^\s*$' -or $_ -match '^\s*#') { return }

    if ($_ -match '^([^=]+)=(.*)$') {
        $name  = $matches[1].Trim()
        $value = $matches[2].Trim()
        [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
        Write-Host "  Set $name" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Starting backend..." -ForegroundColor Green

Set-Location (Join-Path $PSScriptRoot "backend")
& ./mvnw spring-boot:run
