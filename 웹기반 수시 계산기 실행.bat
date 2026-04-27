@echo off
setlocal

cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"

echo ========================================
echo 수시 계산기 웹앱 실행
echo ========================================
echo.

if not exist "C:\Program Files\nodejs\npm.cmd" (
  echo [오류] Node.js를 찾을 수 없습니다.
  echo C:\Program Files\nodejs\npm.cmd 파일이 있어야 합니다.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo [오류] 현재 폴더에 package.json이 없습니다.
  echo 실행 파일은 "웹기반 수시 계산기" 폴더 안에서 실행해야 합니다.
  pause
  exit /b 1
)

echo [1/3] 의존성 확인 중...
if not exist "node_modules" (
  echo node_modules가 없어 npm install을 실행합니다...
  call "C:\Program Files\nodejs\npm.cmd" install
  if errorlevel 1 (
    echo.
    echo [오류] npm install 실행 중 문제가 발생했습니다.
    pause
    exit /b 1
  )
) else (
  echo node_modules가 이미 있어 설치를 건너뜁니다.
)

echo.
echo [2/3] 데이터 파일 확인 중...
if not exist "src\data\calculator-dataset.json" (
  echo 계산기 데이터가 없어 excel:json을 실행합니다...
  call "C:\Program Files\nodejs\npm.cmd" run excel:json
  if errorlevel 1 (
    echo.
    echo [오류] excel:json 실행 중 문제가 발생했습니다.
    pause
    exit /b 1
  )
) else (
  echo 데이터 파일이 이미 있어 생성을 건너뜁니다.
)

echo.
echo [3/3] 개발 서버를 시작합니다...
echo 잠시 후 브라우저가 열립니다.
start "" http://localhost:3000
echo.
echo 서버를 종료하려면 이 창에서 Ctrl + C 를 누르세요.
echo.
call "C:\Program Files\nodejs\npm.cmd" run dev

echo.
echo 서버가 종료되었습니다.
pause