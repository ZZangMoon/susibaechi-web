@echo off
setlocal
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\push-web-deploy-safe.ps1"

if errorlevel 1 (
  echo.
  echo [ERROR] GitHub upload failed.
  echo Check deploy-upload.log in this folder.
  pause
  exit /b 1
)

echo.
echo GitHub upload completed.
echo Vercel will deploy the latest version automatically.
echo Check deploy-upload.log if you want to review the upload log.
pause
