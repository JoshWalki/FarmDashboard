@echo off
title Farm Dashboard Setup
cd /d "%~dp0"

echo ===============================================
echo        Farm Dashboard Setup Script
echo ===============================================
echo.

:: Check if Node.js is installed
echo Checking Node.js installation...
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed
    echo.
    echo Please download and install Node.js from:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Node.js found: 
node --version
echo.

:: Install dependencies
echo Installing required packages...
echo This may take a few minutes...
echo.

call npm install

echo.
echo ===============================================
echo           Setup Complete!
echo ===============================================
echo.
echo The Farm Dashboard mod is now ready to use.
echo.
echo Installation Instructions:
echo 1. Copy this entire FS25_FarmDashboard folder to:
echo    Documents\My Games\FarmingSimulator2025\mods\
echo.
echo 2. Start Farming Simulator 25
echo 3. Enable the "Farm Dashboard Data Exporter" mod
echo 4. Load your save game
echo.
echo The dashboard will start automatically when you load a save!
echo.
echo Now start the dashboard: Double-click 'start-dashboard.bat'
echo.
pause