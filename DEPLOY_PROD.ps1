# Nuanu WiFi - Production Deployment Script
# Destination: root@146.190.90.47:/var/www/nextjsgowifinuanudynamic

$SERVER_IP = "146.190.90.47"
$DEST_PATH = "/var/www/nextjsgowifinuanudynamic"
$USER = "root"

Write-Host "--- Starting Production Build ---" -ForegroundColor Cyan

# 1. Build Go Backend for Linux
Write-Host "Building Go Backend for Linux..." -ForegroundColor Yellow
cd backend
$env:GOOS = "linux"
$env:GOARCH = "amd64"
go build -o server main.go
cd ..

# 2. Build Next.js Frontend
Write-Host "Building Next.js Frontend..." -ForegroundColor Yellow
npm run build

Write-Host "--- Build Complete ---" -ForegroundColor Green

Write-Host "`nTo upload to your server (Lightning Fast - 2 Mins):" -ForegroundColor Cyan
Write-Host "1. Paste this command into your terminal:" -ForegroundColor Gray
Write-Host "scp -r (Get-ChildItem -Exclude 'node_modules', '.git') ${USER}@${SERVER_IP}:${DEST_PATH}"

Write-Host "`n2. On the server, run these setup commands:" -ForegroundColor Gray
Write-Host "   ssh ${USER}@${SERVER_IP}"
Write-Host "   bash ${DEST_PATH}/deploy/setup.sh"
