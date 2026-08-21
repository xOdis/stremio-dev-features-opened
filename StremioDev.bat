@echo off
setlocal
set "WEB_DIR=%~dp0stremio-web"
set "STREMIO_EXE=%LOCALAPPDATA%\Programs\Stremio\stremio-shell-ng.exe"

if not exist "%WEB_DIR%\http_server.js" (
    echo [StremioDev] ERROR: "stremio-web" folder not found next to this file.
    echo             Keep StremioDev.bat in the same folder as stremio-web.
    pause
    exit /b 1
)

if not exist "%STREMIO_EXE%" (
    echo [StremioDev] ERROR: Stremio desktop app not found at:
    echo             %STREMIO_EXE%
    echo             Install the Stremio desktop app first ^(default install location^),
    echo             or edit STREMIO_EXE inside this file.
    pause
    exit /b 1
)

echo [StremioDev] Starting local server if needed...
powershell -NoProfile -Command "if (-not (Get-NetTCPConnection -LocalPort 8082 -State Listen -ErrorAction SilentlyContinue)) { Start-Process node -ArgumentList 'http_server.js' -WorkingDirectory '%WEB_DIR%' -WindowStyle Hidden }"

echo [StremioDev] Waiting for server to answer...
powershell -NoProfile -Command "for ($i=0; $i -lt 20; $i++) { try { Invoke-WebRequest -Uri 'http://127.0.0.1:8082/' -UseBasicParsing -TimeoutSec 1 | Out-Null; exit 0 } catch { Start-Sleep -Milliseconds 500 } }; exit 1"
if errorlevel 1 (
    echo [StremioDev] ERROR: local server did not start. Is Node.js installed?
    echo             Server log: %WEB_DIR%\server.log
    pause
    exit /b 1
)

echo [StremioDev] Launching Stremio...
start "" "%STREMIO_EXE%" --webui-url=http://127.0.0.1:8082/#/?streamingServerUrl=http%%3A%%2F%%2F127.0.0.1%%3A8082 --no-splash
exit /b 0
