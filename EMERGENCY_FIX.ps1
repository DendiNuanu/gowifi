# Nuanu WiFi - EMERGENCY FIX (Flattened)
# ----------------------------------------
$ErrorActionPreference = "Stop"
$SERVER_IP = "146.190.90.47"
$USER = "root"
$DEST_PATH = "/var/www/nextjsgowifinuanudynamic"

Write-Host "STARTING EMERGENCY FIX..." -ForegroundColor Cyan

# We use a single string to guarantee NO Carriage Returns (\r) are sent
$cmd = "export DEBIAN_FRONTEND=noninteractive; echo '1. Fixing Permissions...'; cd ${DEST_PATH}; chown -R root:root .; chmod -R 755 .; chmod -R 755 node_modules/.bin; echo '2. Fixing Binaries...'; chmod +x backend/server; chmod +x deploy/setup.sh; echo '3. Restarting Services...'; systemctl daemon-reload; systemctl restart nuanu-backend; systemctl restart nuanu-frontend; systemctl restart nginx; echo '4. Verifying...'; sleep 3; systemctl status nuanu-frontend --no-pager; echo 'DONE.'"

Write-Host "Running fix on $SERVER_IP..." -ForegroundColor Yellow
ssh -o ServerAliveInterval=60 "$USER@$SERVER_IP" $cmd

Write-Host "Fix applied. Please reload the website." -ForegroundColor Green
