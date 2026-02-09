# Nuanu WiFi - Lightning Fast Production Upload
# This script sends only essential code, skipping node_modules and .git

$USER = "root"
$SERVER_IP = "146.190.90.47"
$DEST_PATH = "/var/www/nextjsgowifinuanudynamic"

Write-Host "--- Starting Lightning Fast Upload ---" -ForegroundColor Cyan
Write-Host "Destination: ${USER}@${SERVER_IP}:${DEST_PATH}" -ForegroundColor Gray

# Optimized Upload: Only essential files and build artifacts
# This reduces size from ~900MB to ~15MB
scp -r (Get-ChildItem -Exclude "node_modules", ".git", ".next", "deploy.zip") "${USER}@${SERVER_IP}:${DEST_PATH}"

# Also upload the production build separately to ensure it goes correctly
Write-Host "Uploading production build (.next)..." -ForegroundColor Yellow
scp -r .next "${USER}@${SERVER_IP}:${DEST_PATH}"

Write-Host "`n--- Upload Complete! ---" -ForegroundColor Green
Write-Host "Now SSH into your server and run the setup script:" -ForegroundColor Cyan
Write-Host "1. ssh ${USER}@${SERVER_IP}"
Write-Host "2. bash ${DEST_PATH}/deploy/setup.sh"
