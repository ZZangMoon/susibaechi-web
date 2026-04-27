$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$git = "C:\Program Files\Git\cmd\git.exe"
$tempRoot = Join-Path $env:TEMP "susibaechi-web-deploy"
$repoUrl = "https://github.com/ZZangMoon/susibaechi-web.git"
$excludeNames = @(
  ".git",
  "node_modules",
  ".next",
  ".next-prod",
  "portable-release",
  "deploy-publish"
)

function Show-Message([string]$message, [string]$title = "웹 배포 업로드") {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show($message, $title) | Out-Null
}

if (-not (Test-Path $git)) {
  Show-Message "Git이 설치되어 있지 않습니다. Git for Windows를 먼저 설치해주세요."
  exit 1
}

Set-Location $projectRoot

if (Test-Path $tempRoot) {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $tempRoot | Out-Null

Get-ChildItem $projectRoot -Force | Where-Object { $_.Name -notin $excludeNames } | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $tempRoot -Recurse -Force
}

Set-Location $tempRoot

& $git init | Out-Null
& $git config user.name "xoans" | Out-Null
& $git config user.email "cpla.gmoon@gmail.com" | Out-Null
& $git add .

$commitMessage = "deploy " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
& $git commit -m $commitMessage | Out-Null
& $git branch -M main | Out-Null
& $git remote add origin $repoUrl | Out-Null
& $git push -f -u origin main

Show-Message "GitHub 업로드가 완료되었습니다.`nVercel이 자동으로 최신 버전을 배포합니다."
