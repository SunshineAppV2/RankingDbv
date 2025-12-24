Write-Host "Reinciando serviços do Ranking DBV..." -ForegroundColor Cyan

# 1. Parar processos Node existentes
Write-Host "Parando processos Node..." -ForegroundColor Yellow
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue

# 2. Iniciar Backend (Nova Janela)
Write-Host "Iniciando Backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& { Set-Location 'g:\Ranking DBV\rankingdbv-backend'; npm run start:dev }"

# 3. Iniciar Frontend (Nova Janela)
Write-Host "Iniciando Frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& { Set-Location 'g:\Ranking DBV\rankingdbv-web'; npm run dev }"

Write-Host "Serviços iniciados!" -ForegroundColor Cyan
