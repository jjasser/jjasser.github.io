@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-auto-publish.ps1"
if errorlevel 1 (
  echo Setup did not finish. Check the error above.
  pause
  exit /b 1
)
echo Automatic publishing is ready.
pause
