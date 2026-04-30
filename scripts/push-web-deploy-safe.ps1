$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$git = "C:\Program Files\Git\cmd\git.exe"
$tempRoot = Join-Path $env:TEMP "susibaechi-web-deploy-safe"
$repoUrl = "https://github.com/ZZangMoon/susibaechi-web.git"
$deployUrl = "https://susibaechi-web-app.vercel.app/calculator"
$logPath = Join-Path $projectRoot "deploy-upload.log"
$excludeNames = @(
  ".git",
  "node_modules",
  ".next",
  ".next-prod",
  "portable-release",
  "deploy-publish",
  "deploy-upload.log",
  "tmp-first-rows.json",
  "tmp-header-dump.json"
)
$deployLabel = "deploy-" + (Get-Date -Format "yyyyMMdd-HHmmss")
$deployedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"

function Write-Log([string]$message) {
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $line = "[$timestamp] $message"
  Add-Content -LiteralPath $logPath -Value $line -Encoding UTF8
  Write-Host $line
}

if (Test-Path $logPath) {
  Remove-Item -LiteralPath $logPath -Force
}

if (-not (Test-Path $git)) {
  Write-Log "Git for Windows was not found."
  exit 1
}

Write-Log "Preparing clean deployment copy."

Set-Location $projectRoot

if (Test-Path $tempRoot) {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $tempRoot | Out-Null

Get-ChildItem $projectRoot -Force | Where-Object { $_.Name -notin $excludeNames } | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $tempRoot -Recurse -Force
}

$deployMetaPath = Join-Path $tempRoot "src\data\deploy-meta.json"
$deployMeta = [ordered]@{
  label = $deployLabel
  deployedAt = $deployedAt
  verifiedAt = ""
} | ConvertTo-Json
Set-Content -LiteralPath $deployMetaPath -Value $deployMeta -Encoding UTF8
Write-Log ("Stamped deploy label: " + $deployLabel)

Write-Log "Initializing temporary Git repository."

Set-Location $tempRoot

& $git init | Out-Null
& $git config user.name "xoans" | Out-Null
& $git config user.email "cpla.gmoon@gmail.com" | Out-Null
& $git add .

$commitMessage = "deploy " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
& $git commit -m $commitMessage | Out-Null
& $git branch -M main | Out-Null
& $git remote add origin $repoUrl | Out-Null

Write-Log ("Pushing to GitHub with commit: " + $commitMessage)
& $git push -f -u origin main

Write-Log "GitHub push completed successfully."
Write-Log "Waiting for Vercel deployment verification."

$verified = $false

for ($attempt = 1; $attempt -le 18; $attempt++) {
  Start-Sleep -Seconds 10

  try {
    $response = Invoke-WebRequest $deployUrl -UseBasicParsing -TimeoutSec 20
    if ($response.Content.Contains($deployLabel)) {
      $verified = $true
      Write-Log ("Vercel verification succeeded on attempt " + $attempt + ": " + $deployLabel)
      break
    }

    Write-Log ("Vercel responded but deploy label is not visible yet. Attempt " + $attempt)
  } catch {
    Write-Log ("Vercel check failed on attempt " + $attempt + ": " + $_.Exception.Message)
  }
}

if (-not $verified) {
  Write-Log "Vercel verification did not confirm the latest deploy within the wait window."
  exit 1
}
