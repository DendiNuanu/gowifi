# Nuanu WiFi - ULTRA FAST Deployment (Auto-Build & Deploy)
# --------------------------------------------------------
$ErrorActionPreference = "Stop"
$SERVER_IP = "146.190.90.47"
$USER = "root"
$DEST_PATH = "/var/www/nextjsgowifinuanudynamic"
$ZIP_NAME = "deploy_nuanu.zip"
$STAGE_DIR = "deploy_stage"

Write-Host "STARTING ULTRA FAST DEPLOYMENT..." -ForegroundColor Cyan

# 1. Build Go Backend (Cross-Compile for Linux)
Write-Host " [1/5] Building Backend..." -ForegroundColor Yellow
$originalEnv = $env:GOOS
$env:GOOS = "linux"
$env:GOARCH = "amd64"
cd backend
if (Test-Path "server") { Remove-Item "server" }
go build -o server main.go
if ($LASTEXITCODE -ne 0) { Write-Error "Backend build failed!"; exit 1 }
cd ..
$env:GOOS = $originalEnv
Write-Host "Backend ready." -ForegroundColor Green

# 2. Build Next.js
Write-Host " [2/5] Building Frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend build failed!"; exit 1 }

if (-not (Test-Path ".next/standalone")) {
    Write-Error "Error: .next/standalone folder missing!"
    exit 1
}
Write-Host "Frontend ready." -ForegroundColor Green

# 3. Prepare Staging Area
Write-Host " [3/5] Staging files..." -ForegroundColor Yellow
if (Test-Path $STAGE_DIR) { Remove-Item $STAGE_DIR -Recurse -Force }
New-Item -ItemType Directory -Path $STAGE_DIR | Out-Null

Copy-Item -Path ".next/standalone/*" -Destination $STAGE_DIR -Recurse -Force
New-Item -ItemType Directory -Path "$STAGE_DIR/.next" -Force | Out-Null
Copy-Item -Path ".next/static" -Destination "$STAGE_DIR/.next/static" -Recurse -Force
Copy-Item -Path "public" -Destination $STAGE_DIR -Recurse -Force
New-Item -ItemType Directory -Path "$STAGE_DIR/backend" -Force | Out-Null
Copy-Item -Path "backend/server" -Destination "$STAGE_DIR/backend/"
Copy-Item -Path "deploy" -Destination $STAGE_DIR -Recurse -Force
Copy-Item -Path ".env" -Destination $STAGE_DIR

# 4. Zip
Write-Host " [4/5] Zipping..." -ForegroundColor Yellow
if (Test-Path $ZIP_NAME) { Remove-Item $ZIP_NAME }
cd $STAGE_DIR
Compress-Archive -Path * -DestinationPath "../$ZIP_NAME" -Force
cd ..
Remove-Item $STAGE_DIR -Recurse -Force
Write-Host "Zip created." -ForegroundColor Green

# 5. Upload & Restart
Write-Host " [5/5] Uploading and Restarting..." -ForegroundColor Yellow

scp $ZIP_NAME "${USER}@${SERVER_IP}:${DEST_PATH}/"

# Fix: Added 'chmod -R 755 .' to ensure Nginx can read all files (fixes 403 Forbidden)
$remoteCommands = "echo 'Stopping services...'; systemctl stop nuanu-backend nuanu-frontend || true; cd ${DEST_PATH}; echo 'Cleaning old files...'; rm -rf .next public backend/server server.js deploy; echo 'Unzipping...'; unzip -o ${ZIP_NAME} > /dev/null; echo 'Fixing Permissions (Critical)...'; chmod -R 755 .; chown -R root:root .; echo 'Restarting...'; bash deploy/setup.sh"

ssh -o ServerAliveInterval=60 "${USER}@${SERVER_IP}" $remoteCommands

Write-Host "DONE! Site is live. PLEASE CLEAR YOUR BROWSER CACHE." -ForegroundColor Cyan
Remove-Item $ZIP_NAME
