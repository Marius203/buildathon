# Launches all three services in separate PowerShell windows.
# Assumes Ollama is already running (tray app or `ollama serve` elsewhere).
# Usage: .\dev.ps1   (from repo root)

$ErrorActionPreference = "Stop"
$root   = $PSScriptRoot
$python = Join-Path $root ".venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    Write-Host "Python venv not found at $python" -ForegroundColor Red
    Write-Host "Create it with: python -m venv .venv" -ForegroundColor Yellow
    exit 1
}

function Start-Service-Window {
    param([string]$Title, [string]$WorkDir, [string]$Command)
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "`$Host.UI.RawUI.WindowTitle = '$Title'; Set-Location '$WorkDir'; $Command"
    ) | Out-Null
}

Write-Host "Starting EC Assistant services..." -ForegroundColor Cyan

Start-Service-Window -Title "EC Agent (:8000)" `
    -WorkDir (Join-Path $root "agent") `
    -Command "& '$python' -m uvicorn app.main:app --reload --port 8000"

Start-Service-Window -Title "EC Backend (:8001)" `
    -WorkDir (Join-Path $root "backend") `
    -Command "& '$python' -m uvicorn app.main:app --reload --port 8001"

Start-Service-Window -Title "EC Frontend (:5173)" `
    -WorkDir (Join-Path $root "frontend") `
    -Command "npm run dev"

Write-Host "Three windows launched:" -ForegroundColor Green
Write-Host "  Agent    -> http://localhost:8000/docs"
Write-Host "  Backend  -> http://localhost:8001/docs"
Write-Host "  Frontend -> http://localhost:5173"
Write-Host ""
Write-Host "Reminder: make sure Ollama is running (bge-m3 model needed for embeddings)." -ForegroundColor Yellow
