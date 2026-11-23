@echo off
setlocal
cd /d "%~dp0"
set "HOST=127.0.0.1"
set "PORT=8788"
if /i not "%~1"=="restart" goto check
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0restart-atlas.ps1"
if errorlevel 1 goto failed
:check
powershell.exe -NoProfile -Command "try { if ((Invoke-RestMethod http://127.0.0.1:8788/api/health -TimeoutSec 2).service -eq 'atlas-career-api') {exit 0} } catch {}; exit 1"
if not errorlevel 1 goto open
if not exist "node_modules\tsx\dist\cli.mjs" goto missing
if not exist "dist\index.html" goto missing
powershell.exe -NoProfile -Command "$app = Start-Process -FilePath node -ArgumentList '--import','tsx','server/index.ts' -WorkingDirectory (Get-Location).Path -WindowStyle Hidden -PassThru; for ($i=0; $i -lt 25; $i++) { if ($app.HasExited) { exit 1 }; try { if ((Invoke-RestMethod http://127.0.0.1:8788/api/health -TimeoutSec 1).service -eq 'atlas-career-api') { exit 0 } } catch {}; Start-Sleep -Milliseconds 250 }; exit 1"
if errorlevel 1 goto failed
:open
start "" "http://127.0.0.1:8788/"
exit /b 0
:missing
echo Install dependencies and build the project first. See PROJECT.md.
pause
exit /b 1
:failed
echo Atlas could not start on port 8788. See PROJECT.md.
pause
exit /b 1
