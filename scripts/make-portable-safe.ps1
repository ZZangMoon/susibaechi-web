$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeRoot = "C:\Program Files\nodejs"
$npm = Join-Path $nodeRoot "npm.cmd"
$releaseRoot = Join-Path $projectRoot "portable-release"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageRoot = Join-Path $releaseRoot ("susibaechi-portable-" + $timestamp)
$zipPath = Join-Path $releaseRoot ("susibaechi-portable-" + $timestamp + ".zip")
$vbsLauncher = Get-ChildItem -Path $projectRoot -Filter "*.vbs" | Select-Object -First 1
$macLauncher = Get-ChildItem -Path $projectRoot -Filter "*.command" | Select-Object -First 1

if (-not (Test-Path $npm)) {
  Write-Error "Node.js is required to create the portable package."
  exit 1
}

if (-not $vbsLauncher) {
  Write-Error "The VBS launcher file was not found in the project root."
  exit 1
}

Set-Location $projectRoot
$env:Path = ($nodeRoot + ";" + $env:Path)

if (-not (Test-Path "node_modules")) {
  & $npm install
  if ($LASTEXITCODE -ne 0) {
    Write-Error "npm install failed."
    exit 1
  }
}

if (-not (Test-Path "src\\data\\calculator-dataset.json")) {
  & $npm run excel:json
  if ($LASTEXITCODE -ne 0) {
    Write-Error "npm run excel:json failed."
    exit 1
  }
}

if (-not (Test-Path ".next-prod\\index.html")) {
  & $npm run build
  if ($LASTEXITCODE -ne 0) {
    Write-Error "npm run build failed."
    exit 1
  }
}

if (-not (Test-Path ".next-prod\\index.html")) {
  Write-Error "The static build output was not created in .next-prod."
  exit 1
}

if (-not (Test-Path $releaseRoot)) {
  New-Item -ItemType Directory -Path $releaseRoot | Out-Null
}

New-Item -ItemType Directory -Path $packageRoot | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageRoot "scripts") | Out-Null

Copy-Item -LiteralPath $vbsLauncher.FullName -Destination $packageRoot
if ($macLauncher) {
  Copy-Item -LiteralPath $macLauncher.FullName -Destination $packageRoot
}
Copy-Item -LiteralPath (Join-Path $projectRoot "scripts\\launch-portable-safe.ps1") -Destination (Join-Path $packageRoot "scripts")
Copy-Item -LiteralPath (Join-Path $projectRoot ".next-prod") -Destination $packageRoot -Recurse

@"
Portable distribution for the Susi Calculator

How to run
Windows
1. Extract the zip file.
2. Double-click the VBS launcher file.
3. The calculator opens in your default browser.

macOS
1. Extract the zip file.
2. Run the .command launcher file.
3. If macOS blocks it the first time, run `chmod +x "<launcher>.command"` once and open it again.
4. The calculator opens in your default browser.

Notes
- Node.js is not required on the target PC.
- Keep the .next-prod folder in the same directory as the launcher.
- On Windows, if VBS is blocked by local security policy, run scripts\launch-portable-safe.ps1 manually with PowerShell.
- On macOS, python3 is required for the local static server.
"@ | Set-Content -LiteralPath (Join-Path $packageRoot "README-PORTABLE.txt") -Encoding UTF8

try {
  Compress-Archive -Path (Join-Path $packageRoot "*") -DestinationPath $zipPath -Force
  Write-Output ("Portable package created: " + $zipPath)
} catch {
  Write-Warning "Zip creation failed, but the portable folder was created successfully."
  Write-Output ("Portable folder created: " + $packageRoot)
}
