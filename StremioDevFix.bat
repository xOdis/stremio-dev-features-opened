@echo off
setlocal
title StremioDev Fix - clean stale processes and relaunch
set "ROOT=%~dp0"
set "WEB_DIR=%ROOT%stremio-web"
set "STREMIO_EXE=%LOCALAPPDATA%\Programs\Stremio\stremio-shell-ng.exe"

echo ============================================================
echo  StremioDev FIX
echo  Closes stale Stremio/server copies and relaunches the DEV UI
echo  Serving folder: %WEB_DIR%
echo ============================================================
echo.

if not exist "%WEB_DIR%\http_server.js" (
    echo [StremioDevFix] ERROR: "stremio-web" folder not found next to this file.
    echo             Keep StremioDevFix.bat in the same folder as stremio-web.
    pause
    exit /b 1
)

if not exist "%STREMIO_EXE%" (
    echo [StremioDevFix] ERROR: Stremio desktop app not found at:
    echo             %STREMIO_EXE%
    pause
    exit /b 1
)

echo [1/4] Closing ALL Stremio windows (stock or dev)...
taskkill /F /IM stremio-shell-ng.exe 2>nul
taskkill /F /IM stremio-runtime.exe 2>nul
ping -n 3 127.0.0.1 >nul

echo [2/4] Closing stale dev server (node http_server.js)...
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*http_server.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
ping -n 3 127.0.0.1 >nul

echo [3/4] Starting dev server...
powershell -NoProfile -Command "Start-Process node -ArgumentList 'http_server.js' -WorkingDirectory '%WEB_DIR%' -WindowStyle Hidden"

echo     Waiting for server to answer...
powershell -NoProfile -Command "for ($i=0; $i -lt 20; $i++) { try { Invoke-WebRequest -Uri 'http://127.0.0.1:8082/' -UseBasicParsing -TimeoutSec 1 | Out-Null; exit 0 } catch { Start-Sleep -Milliseconds 500 } }; exit 1"
if errorlevel 1 (
    echo [StremioDevFix] ERROR: local server did not start. Check the log:
    echo             %WEB_DIR%\server.log
    pause
    exit /b 1
)

echo [4/4] Verifying this is OUR dev server (and not stock Stremio)...
powershell -NoProfile -Command "(Invoke-WebRequest -Uri 'http://127.0.0.1:8082/' -UseBasicParsing -TimeoutSec 3).Content" | findstr /C:"service worker registration blocked" >nul
if errorlevel 1 (
    echo [StremioDevFix] WARNING: port 8082 answers, but it is NOT the dev server.
    echo             Something else is using the port. Close it and run again.
    pause
    exit /b 1
)
echo     Verified: dev server is serving your custom build.

echo.
echo Launching Stremio (dev UI)...
start "" "%STREMIO_EXE%" --webui-url=http://127.0.0.1:8082/#/?streamingServerUrl=http%%3A%%2F%%2F127.0.0.1%%3A8082 --no-splash

echo.
echo Done. Tips:
echo  - Always launch with StremioDev.exe or this file, never the stock icon.
echo  - If the UI ever looks old/stock, press Ctrl+R once inside Stremio.
pause
exit /b 0
