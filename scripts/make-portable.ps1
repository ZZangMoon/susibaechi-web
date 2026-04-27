$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeRoot = "C:\Program Files\nodejs"
$npm = Join-Path $nodeRoot "npm.cmd"
$releaseRoot = Join-Path $projectRoot "portable-release"
$packageRoot = Join-Path $releaseRoot "웹기반 수시 계산기"
$zipPath = Join-Path $releaseRoot "웹기반 수시 계산기-포터블.zip"

if (-not (Test-Path $npm)) {
  Write-Error "Node.js가 설치되어 있지 않아 포터블 배포본을 만들 수 없습니다."
  exit 1
}

Set-Location $projectRoot
$env:Path = "$nodeRoot;$env:Path"

if (-not (Test-Path "node_modules")) {
  & $npm install
  if ($LASTEXITCODE -ne 0) {
    Write-Error "npm install 실행 중 오류가 발생했습니다."
    exit 1
  }
}

if (-not (Test-Path "src\data\calculator-dataset.json")) {
  & $npm run excel:json
  if ($LASTEXITCODE -ne 0) {
    Write-Error "excel:json 실행 중 오류가 발생했습니다."
    exit 1
  }
}

& $npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Error "npm run build 실행 중 오류가 발생했습니다."
  exit 1
}

if (Test-Path $releaseRoot) {
  Remove-Item -LiteralPath $releaseRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $packageRoot | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageRoot "scripts") | Out-Null

Copy-Item -LiteralPath (Join-Path $projectRoot "수시 계산기 브라우저 실행.vbs") -Destination $packageRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "scripts\launch-portable.ps1") -Destination (Join-Path $packageRoot "scripts")
Copy-Item -LiteralPath (Join-Path $projectRoot ".next-prod") -Destination $packageRoot -Recurse

@"
웹기반 수시 계산기 포터블 배포본

실행 방법
1. 압축을 푼 뒤 '수시 계산기 브라우저 실행.vbs' 를 더블클릭합니다.
2. 브라우저에서 계산기 화면이 자동으로 열립니다.

특징
- Node.js 설치가 없어도 실행됩니다.
- 인터넷 연결 없이 실행됩니다.
- 포트 3010~3030 중 비어 있는 포트를 자동으로 사용합니다.

주의
- 압축을 푼 뒤 폴더째로 이동하는 것은 괜찮지만, .next-prod 폴더 안 파일을 따로 빼면 실행되지 않을 수 있습니다.
- 회사/학교 보안 정책이 강한 PC에서는 VBS 실행이 막힐 수 있습니다. 그 경우 scripts\launch-portable.ps1 을 우클릭 실행하거나 PowerShell 허용 여부를 확인해주세요.
"@ | Set-Content -LiteralPath (Join-Path $packageRoot "배포용 실행 안내.txt") -Encoding UTF8

Compress-Archive -Path (Join-Path $packageRoot "*") -DestinationPath $zipPath -Force
Write-Output "포터블 배포본 생성 완료: $zipPath"
