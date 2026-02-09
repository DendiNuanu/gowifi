@echo off
cd /d "%~dp0"
echo Starting Go Backend Server...
go run main.go
if errorlevel 1 (
    echo Error: Failed to start Go backend
    echo Make sure you have Go installed and all dependencies are present
    pause
)
