# Nuanu WiFi - FULL AUTOMATIC DEPLOYMENT
# ----------------------------------------
# This script builds everything locally and deploys to production.

$SERVER_IP = "146.190.90.47"
$USER = "root"
$DEST_PATH = "/var/www/nextjsgowifinuanudynamic"
$ZIP_NAME = "deploy_auto_release.zip"

Write-Host "🚀 STARTING FULL AUTO DEPLOYMENT..." -ForegroundColor Cyan

# 1. Build Go Backend (Cross-Compile for Linux)
Write-Host "`n📦 [1/5] Building Backend (Go -> Linux/AMD64)..." -ForegroundColor Yellow
$originalEnv = $env:GOOS
$env:GOOS = "linux"
$env:GOARCH = "amd64"
cd backend
go build -o server main.go
if ($LASTEXITCODE -ne 0) { Write-Error "Backend build failed!"; exit 1 }
cd ..
$env:GOOS = $originalEnv # Restore
Write-Host "✅ Backend built successfully." -ForegroundColor Green

# 2. Build Next.js Frontend
Write-Host "`n⚛️  [2/5] Building Frontend (Next.js)..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend build failed!"; exit 1 }
Write-Host "✅ Frontend built successfully." -ForegroundColor Green

# 3. Create Deployment Package (ZIP)
Write-Host "`n🗜️  [3/5] Creating Package ($ZIP_NAME)..." -ForegroundColor Yellow
if (Test-Path $ZIP_NAME) { Remove-Item $ZIP_NAME }

# Define items to include
$deployItems = @(
    "backend/server",   # The linux binary
    ".next",            # The frontend build
    "public",           # Static assets
    "deploy",           # Server configs/scripts
    "package.json", 
    "package-lock.json",
    ".env"              # Env vars
)

Compress-Archive -Path $deployItems -DestinationPath $ZIP_NAME -Force
Write-Host "✅ Package created (~$( (Get-Item $ZIP_NAME).Length / 1MB ) MB)." -ForegroundColor Green

# 4. Upload to Server
Write-Host "`n☁️  [4/5] Uploading to $SERVER_IP..." -ForegroundColor Yellow
Write-Host "Note: You may be asked for the server password." -ForegroundColor Gray
scp $ZIP_NAME "${USER}@${SERVER_IP}:${DEST_PATH}/"
if ($LASTEXITCODE -ne 0) { Write-Error "Upload failed!"; exit 1 }
Write-Host "✅ Upload successful." -ForegroundColor Green

# 5. Remote Setup & Restart
Write-Host "`n🔄 [5/5] Restarting Services on Remote Server..." -ForegroundColor Yellow
$remoteCommands = "
    cd $DEST_PATH
    echo 'Extracting...'
    apt install unzip -y > /dev/null
    unzip -o $ZIP_NAME
    chmod +x backend/server
    echo 'Running Setup...'
    bash deploy/setup.sh
    echo 'Done!'
"
ssh "$USER@$SERVER_IP" $remoteCommands

Write-Host "`n🎉 DEPLOYMENT COMPLETE! Check the site at http://${SERVER_IP} or https://gowifi.nuanu.io" -ForegroundColor Cyan
Remove-Item $ZIP_NAME
