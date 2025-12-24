# Check and Start Servers Script

$BackendPort = 3000
$FrontendPort = 5173
$BackendPath = "$PSScriptRoot\rankingdbv-backend"
$FrontendPath = "$PSScriptRoot\rankingdbv-web"

function Test-PortConnection {
    param (
        [int]$Port
    )
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -ne $connection
}

function Start-Backend {
    Write-Host "Iniciando Backend..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BackendPath'; npm run start:dev"
}

function Start-Frontend {
    Write-Host "Iniciando Frontend..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$FrontendPath'; npm run dev"
}

# Check Backend
if (Test-PortConnection $BackendPort) {
    Write-Host "Backend rodando na porta $BackendPort." -ForegroundColor Green
}
else {
    Write-Host "Backend NÃO encontrado na porta $BackendPort." -ForegroundColor Red
    Start-Backend
}

# Check Frontend
if (Test-PortConnection $FrontendPort) {
    Write-Host "Frontend rodando na porta $FrontendPort." -ForegroundColor Green
}
else {
    Write-Host "Frontend NÃO encontrado na porta $FrontendPort." -ForegroundColor Red
    Start-Frontend
}

Write-Host "Verificação concluída." -ForegroundColor Cyan
