@echo off
title WATCHIT - Football Live
echo.
echo  ================================
echo     WATCHIT - Football Live
echo  ================================
echo.

cd /d "%~dp0"

echo  Stopping any existing server on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
timeout /t 1 /nobreak >nul

echo  Starting server...
echo.
node server.js
pause
