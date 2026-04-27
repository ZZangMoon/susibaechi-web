param(
  [Parameter(Mandatory = $true)]
  [string]$WorkbookPath,
  [string]$SheetPath = "xl/worksheets/sheet1.xml",
  [string]$OutputPath = ".\analysis\formula-profile.json"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Read-EntryXml {
  param(
    [System.IO.Compression.ZipArchive]$Zip,
    [string]$Path
  )

  $entry = $Zip.GetEntry($Path)
  if (-not $entry) {
    throw "ZIP entry not found: $Path"
  }

  $reader = New-Object IO.StreamReader($entry.Open())
  try {
    [xml]$content = $reader.ReadToEnd()
    return $content
  } finally {
    $reader.Close()
  }
}

function Normalize-Formula {
  param([string]$Formula)

  if ([string]::IsNullOrWhiteSpace($Formula)) {
    return $Formula
  }

  $normalized = $Formula -replace '\$?[A-Z]{1,3}\$?\d+', '<CELL>'
  $normalized = $normalized -replace '\d+', '<N>'
  return $normalized
}

New-Item -ItemType Directory -Force -Path (Split-Path $OutputPath) | Out-Null

$zip = [IO.Compression.ZipFile]::OpenRead($WorkbookPath)
try {
  $sheetXml = Read-EntryXml -Zip $zip -Path $SheetPath
  $ns = New-Object System.Xml.XmlNamespaceManager($sheetXml.NameTable)
  $ns.AddNamespace("x", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")

  $profile = @{}
  foreach ($cell in $sheetXml.SelectNodes("//x:c[x:f]", $ns)) {
    $ref = $cell.GetAttribute("r")
    $formula = $cell.SelectSingleNode("./x:f", $ns).InnerText
    $column = ($ref -replace '\d+', '')
    $normalized = Normalize-Formula -Formula $formula

    if (-not $profile.ContainsKey($column)) {
      $profile[$column] = @{}
    }

    if (-not $profile[$column].ContainsKey($normalized)) {
      $profile[$column][$normalized] = [ordered]@{
        count = 0
        samples = @()
      }
    }

    $profile[$column][$normalized].count += 1
    if ($profile[$column][$normalized].samples.Count -lt 5) {
      $profile[$column][$normalized].samples += [ordered]@{
        ref = $ref
        formula = $formula
      }
    }
  }

  $result = [ordered]@{}
  foreach ($column in ($profile.Keys | Sort-Object)) {
    $patterns = @()
    foreach ($pattern in $profile[$column].Keys) {
      $patterns += [ordered]@{
        normalized = $pattern
        count = $profile[$column][$pattern].count
        samples = $profile[$column][$pattern].samples
      }
    }
    $result[$column] = $patterns | Sort-Object -Property count -Descending
  }

  $result | ConvertTo-Json -Depth 8 | Set-Content -Path $OutputPath -Encoding UTF8
  Write-Output "Saved formula profile to $OutputPath"
} finally {
  $zip.Dispose()
}
