$ErrorActionPreference = "Stop"
Write-Host "Installing UPNEX dependencies..." -ForegroundColor Cyan
npm install
Write-Host "Starting UPNEX (API + web)..." -ForegroundColor Green
npm run dev