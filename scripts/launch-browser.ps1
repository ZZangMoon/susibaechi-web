$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeRoot = 'C:\Program Files\nodejs'
$npm = Join-Path $nodeRoot 'npm.cmd'
$portRange = 3010..3030

function Show-ErrorMessage([string]$message) {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show($message, '수시 계산기 실행 오류') | Out-Null
}

function Test-PortAvailable([int]$port) {
  try {
    $matches = netstat -ano | Select-String "[:\.]$port\s"
    return ($matches.Count -eq 0)
  } catch {
    return $false
  }
}

function Get-FreePort([int[]]$ports) {
  foreach ($port in $ports) {
    if (Test-PortAvailable -port $port) {
      return $port
    }
  }
  return $null
}

if (-not (Test-Path $npm)) {
  Show-ErrorMessage 'Node.js가 설치되어 있지 않거나 npm.cmd를 찾을 수 없습니다. C:\Program Files\nodejs 경로를 확인해주세요.'
  exit 1
}

Set-Location $projectRoot
$env:Path = "$nodeRoot;$env:Path"

if (-not (Test-Path 'node_modules')) {
  & $npm install
  if ($LASTEXITCODE -ne 0) {
    Show-ErrorMessage 'npm install 실행 중 오류가 발생했습니다.'
    exit 1
  }
}

if (-not (Test-Path 'src\data\calculator-dataset.json')) {
  & $npm run excel:json
  if ($LASTEXITCODE -ne 0) {
    Show-ErrorMessage 'excel:json 실행 중 오류가 발생했습니다.'
    exit 1
  }
}

if (-not (Test-Path '.next-prod\BUILD_ID')) {
  & $npm run build
  if ($LASTEXITCODE -ne 0) {
    Show-ErrorMessage '실행용 build(.next-prod) 생성 중 오류가 발생했습니다. 이미 떠 있는 서버를 종료한 뒤 다시 시도해주세요.'
    exit 1
  }
}

$port = Get-FreePort -ports $portRange
if (-not $port) {
  Show-ErrorMessage '3010~3030 포트가 모두 사용 중입니다. 다른 localhost 서버를 종료한 뒤 다시 시도해주세요.'
  exit 1
}

$startCommand = "Set-Location '$projectRoot'; `$env:Path = '$nodeRoot;' + `$env:Path; & '$npm' run start -- --port $port"
Start-Process powershell.exe -WindowStyle Hidden -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $startCommand | Out-Null

$serverReady = $false
for ($index = 0; $index -lt 45; $index++) {
  Start-Sleep -Seconds 1
  try {
    Invoke-WebRequest "http://localhost:$port/calculator" -UseBasicParsing -TimeoutSec 1 | Out-Null
    $serverReady = $true
    break
  } catch {
    $serverReady = $false
  }
}

if (-not $serverReady) {
  Show-ErrorMessage "서버가 45초 안에 실행되지 않았습니다. 시도한 포트: $port"
  exit 1
}

Start-Process "http://localhost:$port/calculator"
