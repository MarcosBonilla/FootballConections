# Script para iniciar el servidor API con Node.js
# Uso: .\start-server.ps1

Write-Host "🚀 Iniciando API Server..." -ForegroundColor Cyan

# Navegar al directorio raíz del proyecto
Set-Location $PSScriptRoot\..\..\

# Iniciar servidor con Node.js + tsx (mejor compatibilidad DNS que Bun)
npx tsx --env-file=.env apps/api/src/index.ts
