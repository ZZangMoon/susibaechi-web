$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeRoot = "C:\Program Files\nodejs"
$npm = Join-Path $nodeRoot "npm.cmd"
$portRange = 3010..3030
$siteRoot = Join-Path $projectRoot ".next-prod"
$hostName = "127.0.0.1"

function Show-ErrorMessage([string]$message) {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show($message, "수시 계산기 실행 오류") | Out-Null
}

function Test-PortAvailable([int]$port) {
  try {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    return ($null -eq $connection)
  } catch {
    $listener = $null
    try {
      $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
      $listener.Start()
      return $true
    } catch {
      return $false
    } finally {
      if ($listener) {
        $listener.Stop()
      }
    }
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

function Ensure-ExportOutput {
  if (Test-Path (Join-Path $siteRoot "index.html")) {
    return $true
  }

  if (-not (Test-Path $npm)) {
    Show-ErrorMessage "배포용 정적 파일(.next-prod 폴더)이 없고 Node.js도 설치되어 있지 않아 자동 복구를 할 수 없습니다.`n보내는 쪽 PC에서 package:portable 실행 후 만들어진 배포본을 다시 전달해주세요."
    return $false
  }

  Set-Location $projectRoot
  $env:Path = "$nodeRoot;$env:Path"

  if (-not (Test-Path "node_modules")) {
    & $npm install
    if ($LASTEXITCODE -ne 0) {
      Show-ErrorMessage "npm install 실행 중 오류가 발생했습니다."
      return $false
    }
  }

  if (-not (Test-Path "src\data\calculator-dataset.json")) {
    & $npm run excel:json
    if ($LASTEXITCODE -ne 0) {
      Show-ErrorMessage "excel:json 실행 중 오류가 발생했습니다."
      return $false
    }
  }

  & $npm run build
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path (Join-Path $siteRoot "index.html"))) {
    Show-ErrorMessage "배포용 정적 파일(.next-prod 폴더) 생성 중 오류가 발생했습니다."
    return $false
  }

  return $true
}

function Get-ContentType([string]$path) {
  switch ([System.IO.Path]::GetExtension($path).ToLowerInvariant()) {
    ".html" { return "text/html; charset=utf-8" }
    ".css" { return "text/css; charset=utf-8" }
    ".js" { return "application/javascript; charset=utf-8" }
    ".json" { return "application/json; charset=utf-8" }
    ".txt" { return "text/plain; charset=utf-8" }
    ".svg" { return "image/svg+xml" }
    ".png" { return "image/png" }
    ".jpg" { return "image/jpeg" }
    ".jpeg" { return "image/jpeg" }
    ".gif" { return "image/gif" }
    ".ico" { return "image/x-icon" }
    ".woff" { return "font/woff" }
    ".woff2" { return "font/woff2" }
    default { return "application/octet-stream" }
  }
}

function Resolve-RequestPath([string]$rawPath) {
  $cleanPath = [Uri]::UnescapeDataString(($rawPath -split "\?")[0]).TrimStart("/")

  if ([string]::IsNullOrWhiteSpace($cleanPath)) {
    $cleanPath = "index.html"
  }

  $candidatePaths = [System.Collections.Generic.List[string]]::new()
  $candidatePaths.Add($cleanPath)

  if (-not [System.IO.Path]::HasExtension($cleanPath)) {
    $candidatePaths.Add("$cleanPath.html")
    $candidatePaths.Add((Join-Path $cleanPath "index.html"))
  }

  foreach ($relativePath in $candidatePaths) {
    $combinedPath = Join-Path $siteRoot $relativePath
    $fullPath = [System.IO.Path]::GetFullPath($combinedPath)
    $siteRootFullPath = [System.IO.Path]::GetFullPath($siteRoot)

    if (-not $fullPath.StartsWith($siteRootFullPath, [System.StringComparison]::OrdinalIgnoreCase)) {
      continue
    }

    if (Test-Path $fullPath -PathType Leaf) {
      return $fullPath
    }
  }

  return $null
}

function Write-HttpResponse(
  [System.Net.Sockets.NetworkStream]$stream,
  [int]$statusCode,
  [string]$statusText,
  [string]$contentType,
  [byte[]]$body
) {
  $header = "HTTP/1.1 $statusCode $statusText`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($body.Length -gt 0) {
    $stream.Write($body, 0, $body.Length)
  }
}

function Start-StaticServer([int]$port) {
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse($hostName), $port)
  $listener.Start()

  Start-Process "http://$hostName`:$port/calculator/"

  try {
    while ($true) {
      $client = $listener.AcceptTcpClient()

      try {
        $stream = $client.GetStream()
        $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
        $requestLine = $reader.ReadLine()

        while ($true) {
          $headerLine = $reader.ReadLine()
          if ([string]::IsNullOrEmpty($headerLine)) {
            break
          }
        }

        $requestPath = "/"
        if ($requestLine -match "^[A-Z]+\s+([^\s]+)") {
          $requestPath = $matches[1]
        }

        $filePath = Resolve-RequestPath -rawPath $requestPath
        if (-not $filePath) {
          $body = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
          Write-HttpResponse -stream $stream -statusCode 404 -statusText "Not Found" -contentType "text/plain; charset=utf-8" -body $body
          continue
        }

        $body = [System.IO.File]::ReadAllBytes($filePath)
        $contentType = Get-ContentType -path $filePath
        Write-HttpResponse -stream $stream -statusCode 200 -statusText "OK" -contentType $contentType -body $body
      } finally {
        if ($reader) {
          $reader.Dispose()
        }
        if ($stream) {
          $stream.Dispose()
        }
        $client.Close()
      }
    }
  } finally {
    $listener.Stop()
  }
}

if (-not (Ensure-ExportOutput)) {
  exit 1
}

$port = Get-FreePort -ports $portRange
if (-not $port) {
  Show-ErrorMessage "3010~3030 포트가 모두 사용 중입니다. 다른 localhost 서버를 종료한 뒤 다시 시도해주세요."
  exit 1
}

Start-StaticServer -port $port
