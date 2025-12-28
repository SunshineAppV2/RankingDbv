# Script to open Firewall ports for RankingDBV
Write-Host "Configurando Firewall para RankingDBV..." -ForegroundColor Cyan

$ports = @(3000, 5173)
$ruleName = "RankingDBV - Dev Server"

# Remove existing rules with same name to avoid duplicates
Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

# New Rule
New-NetFirewallRule -DisplayName $ruleName `
    -Direction Inbound `
    -LocalPort $ports `
    -Protocol TCP `
    -Action Allow `
    -Profile Any

Write-Host "Regras de Firewall criadas para as portas: $($ports -join ', ')" -ForegroundColor Green
Write-Host "Tente acessar novamente pelo outro dispositivo." -ForegroundColor Yellow
