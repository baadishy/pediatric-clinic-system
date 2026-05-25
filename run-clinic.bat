@echo off
title عيادة الأطفال - Pediatric Clinic Launcher
echo ===================================================
echo   Pediatric Clinic Standalone Launcher (Lightweight Mode)
echo ===================================================
echo.
echo Installing dependencies (if needed)...
call npm install --no-audit --no-fund

echo.
echo Building the application...
call npm run build

echo.
echo Starting Clinic Database & Backend Server...
echo The application is ready! Your browser will open shortly...
echo.

:: Start the server in the background
start /b node dist/server.cjs

:: Wait 2 seconds for server to spin up
timeout /t 2 >nul 2>&1

:: Open the default system browser
start http://localhost:3000

echo.
echo Server is running fine. 
echo -> Keep this window open while using the application.
echo -> To close the app, simply close this window.
echo.
pause
