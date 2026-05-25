@echo off
title عيادة الأطفال - Pediatric Clinic Launcher
echo ===================================================
echo   Pediatric Clinic Standalone Launcher (Desktop Window Mode)
echo ===================================================
echo.

:: Force PORT 3000 to keep server and launcher perfectly in sync
set PORT=3000

echo Installing dependencies (if needed)...
call npm install --no-audit --no-fund

echo.
echo Building the application...
call npm run build

echo.
echo Starting Clinic Database & Backend Server on port %PORT%...
echo.

:: Start the server in the background
start /b node dist/server.cjs

:: Wait 3 seconds for server to spin up
timeout /t 3 >nul 2>&1

:: Find preferred browser for Desktop App Mode (borderless, separate window)
set BROWSER_PATH=""

:: Check for Microsoft Edge
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    set BROWSER_PATH="%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    set BROWSER_PATH="%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%LocalAppData%\Microsoft\Edge\Application\msedge.exe" (
    set BROWSER_PATH="%LocalAppData%\Microsoft\Edge\Application\msedge.exe"
)

:: Check for Google Chrome (takes precedence if found)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set BROWSER_PATH="%ProgramFiles%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set BROWSER_PATH="%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    set BROWSER_PATH="%LocalAppData%\Google\Chrome\Application\chrome.exe"
)

:: Run the application
if not %BROWSER_PATH% == "" (
    echo Opening Clinic in standalone Desktop App Frame...
    start "" %BROWSER_PATH% --app=http://localhost:%PORT%
) else (
    echo Standalone browser frame not found. Opening in default browser tab...
    start http://localhost:%PORT%
)

echo.
echo Server is running fine. 
echo -^> Keep this terminal window open while using the application.
echo -^> To close the app, simply close this window.
echo.
pause
