@echo off
setlocal EnableDelayedExpansion

echo.
echo ========================================
echo    Farm Dashboard Startup Script
echo ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

:: Display Node.js version
for /f "tokens=*" %%i in ('node --version') do set "node_version=%%i"
echo [INFO] Using Node.js %node_version%

:: Check if server.js exists
if not exist "server.js" (
    echo [ERROR] server.js not found in current directory.
    echo Please run this script from the FS25_FarmDashboard directory.
    pause
    exit /b 1
)

:: Check if dependencies are installed
if not exist "node_modules" (
    echo [ERROR] Dependencies not installed. Please run setup.bat first.
    pause
    exit /b 1
)

:: Kill any existing Node.js processes to prevent port conflicts
echo.
echo [STEP 1] Cleaning up any existing processes...
:: This is causing workflow issues. Keep it disabled.
:: Taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: Start the Dashboard Server
echo.
echo [STEP 2] Starting Farm Dashboard Server (Port 8766)...
start "Farm Dashboard Server" cmd /k "echo Starting server... && node server.js && pause"
timeout /t 3 /nobreak >nul

:: Get local IP address for network access
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%j in ("%%i") do (
        set "LOCAL_IP=%%j"
        goto :found_ip
    )
)
:found_ip
:: Remove leading spaces from IP
set "LOCAL_IP=%LOCAL_IP: =%"

:: Final status and instructions
echo.
echo ========================================
echo           FARM DASHBOARD READY
echo ========================================
echo.
echo Service Starting:
echo  - Local Access:   http://localhost:8766
if defined LOCAL_IP (
    echo  - Network Access: http://%LOCAL_IP%:8766
)
echo.
echo Next Steps:
echo  1. Make sure Farming Simulator 25 is running
echo  2. Ensure FS25_FarmDashboard mod is active in-game
echo  3. Open your web browser to: http://localhost:8766
echo.
if defined LOCAL_IP (
    echo Network Access:
    echo  - Use http://%LOCAL_IP%:8766 from other devices
    echo  - Phones, tablets, other PCs on same network can access
    echo  - Make sure Windows Firewall allows Node.js connections
    echo.
)
echo The dashboard will automatically connect when game data is available.
echo.
echo Press any key to open the dashboard in your default browser...
pause >nul

:: Open the dashboard in default browser
start http://localhost:8766

echo.
echo Dashboard opened! The server window will remain open.
if defined LOCAL_IP (
    echo.
    echo Network URL: http://%LOCAL_IP%:8766
    echo Share this URL with other devices on your network!
)
echo You can close this window.
pause