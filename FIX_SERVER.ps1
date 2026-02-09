# Nuanu WiFi - SERVER REPAIR SCRIPT v4 (FINAL)
# -----------------------------------
$ErrorActionPreference = "Stop"
$SERVER_IP = "146.190.90.47"
$USER = "root"
$DEST_PATH = "/var/www/nextjsgowifinuanudynamic"

Write-Host "STARTING SERVER REPAIR (Permissions & Config)..." -ForegroundColor Cyan

# Define commands in a clean block
$commands = @"
    export DEBIAN_FRONTEND=noninteractive
    
    echo '1. Installing utilities (if missing)...'
    apt-get update -qq > /dev/null
    apt-get install -y dos2unix > /dev/null

    echo '2. Fixing Line Endings (CRLF -> LF)...'
    # Fix setup script first
    dos2unix $DEST_PATH/deploy/setup.sh
    chmod +x $DEST_PATH/deploy/setup.sh
    
    # Fix all other scripts
    find $DEST_PATH -name "*.sh" -exec dos2unix {} +
    find $DEST_PATH/deploy -type f -exec dos2unix {} +
    
    echo '3. FIXING PERMISSIONS (Solving 403 Forbidden)...'
    # Reset ownership
    chown -R root:root $DEST_PATH
    
    # Directories = 755 (Accessible to everyone)
    find $DEST_PATH -type d -exec chmod 755 {} +
    
    # Files = 644 (Readable by everyone)
    find $DEST_PATH -type f -exec chmod 644 {} +
    
    # Executables = 755
    chmod 755 $DEST_PATH/backend/server
    chmod 755 $DEST_PATH/deploy/setup.sh

    echo '4. Re-running Setup...'
    cd $DEST_PATH
    bash deploy/setup.sh

    echo '5. Restarting Nginx...'
    systemctl restart nginx
    
    echo 'SUCCESS: Server repaired.'
"@

# CRITICAL FIX: Remove Windows Carriage Returns (\r) from the string before sending to Linux
$cleanCommands = $commands -replace "`r", ""

Write-Host "Connecting to $SERVER_IP..." -ForegroundColor Yellow
ssh -o ServerAliveInterval=60 "$USER@$SERVER_IP" $cleanCommands

Write-Host "`nREPAIR COMPLETE. Please refresh the website." -ForegroundColor Green
