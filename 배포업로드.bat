@echo off
setlocal
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\push-web-deploy.ps1"

if errorlevel 1 (
  echo.
  echo [오류] GitHub 업로드 중 문제가 발생했습니다.
  pause
  exit /b 1
)

echo.
echo GitHub 업로드가 완료되었습니다.
echo Vercel이 자동으로 최신 내용을 배포합니다.
pause
