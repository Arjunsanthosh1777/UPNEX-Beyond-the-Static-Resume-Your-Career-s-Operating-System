$ErrorActionPreference = "Stop"
Write-Host "Installing UPNEX dependencies..." -ForegroundColor Cyan
npm install
npm install --prefix backend
npm install --prefix frontend
Write-Host "Starting UPNEX..." -ForegroundColor Green
npm run dev
