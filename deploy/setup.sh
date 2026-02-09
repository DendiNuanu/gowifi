#!/bin/bash

# Nuanu WiFi - Server Side Setup Script
# Run this AFTER uploading files to /var/www/nextjsgowifinuanudynamic

PROJECT_ROOT="/var/www/nextjsgowifinuanudynamic"

echo "--- Starting Server Setup ---"

# 1. Update Permissions
echo "Setting permissions..."
chown -R root:root $PROJECT_ROOT

# Ensure backend directory exists and Move server binary if it was unzipped to root
mkdir -p $PROJECT_ROOT/backend
if [ -f "$PROJECT_ROOT/server" ]; then
    mv $PROJECT_ROOT/server $PROJECT_ROOT/backend/server
fi

chmod +x $PROJECT_ROOT/backend/server

# 2. Install Dependencies (Node.js, Nginx, Certbot)
echo "Installing system dependencies..."
apt update
apt install -y curl nginx certbot python3-certbot-nginx

# 3. Install Node.js Dependencies
echo "Installing Node.js dependencies..."
cd $PROJECT_ROOT
npm install --production

# 4. Setup Nginx and SSL
echo "Configuring Nginx and SSL..."
cp $PROJECT_ROOT/deploy/nginx.conf /etc/nginx/sites-available/nuanu
ln -s /etc/nginx/sites-available/nuanu /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# Request SSL Certificate (Requires domain gowifi.nuanu.io to point to this IP)
certbot --nginx -d gowifi.nuanu.io --non-interactive --agree-tos -m your-email@example.com

# 5. Setup Systemd Services
echo "Configuring systemd..."
cp $PROJECT_ROOT/deploy/*.service /etc/systemd/system/
systemctl daemon-reload

# 4. Enable and Start Services
echo "Starting services..."
systemctl enable nuanu-backend nuanu-frontend
systemctl restart nuanu-backend nuanu-frontend

# 5. Check Status
echo "--- Installation Complete ---"
systemctl status nuanu-backend nuanu-frontend --no-pager
