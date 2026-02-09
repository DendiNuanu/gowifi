# Nuanu WiFi - GitHub Push Automation
# This script automates git init, commit, and push to your repository

$REPO_URL = "https://github.com/DendiNuanu/gowifi.git"

Write-Host "--- Starting GitHub Push ---" -ForegroundColor Cyan

# 1. Initialize Git if not already done
if (!(Test-Path .git)) {
    Write-Host "Initializing Git repository..." -ForegroundColor Yellow
    git init
    git branch -M main
    git remote add origin $REPO_URL
}

# 2. Add files (Respects .gitignore automatically)
Write-Host "Adding files..." -ForegroundColor Gray
git add .

# 3. Commit changes
$CommitMsg = "Update: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Write-Host "Committing with message: '$CommitMsg'..." -ForegroundColor Gray
git commit -m $CommitMsg

# 4. Push to GitHub
Write-Host "Pushing to GitHub (Main)..." -ForegroundColor Green
git push -u origin main

Write-Host "`n--- GitHub Push Complete! ---" -ForegroundColor Green
Write-Host "View your code at: ${REPO_URL}" -ForegroundColor Cyan
