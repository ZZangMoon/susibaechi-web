$ErrorActionPreference = "Stop"

param(
  [string]$WorkbookPath = "C:\Users\xoans\OneDrive\문서\카카오톡 받은 파일\입시위키 수시배치(260414ver2).xlsx",
  [string]$OutputPath = ".\analysis\excel-analysis.json"
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-CellText {
  param(
    [System.Xml.XmlElement]$Cell,
    [string[]]$SharedStrings
  )

  if (-not $Cell) {
    return $null
  }

  $type = $Cell.GetAttribute("t")
  $valueNode = $Cell.SelectSingleNode("./x:v", $script:ns)
  $inlineNode = $Cell.SelectSingleNode("./x:is/x:t", $script:ns)

  if ($type -eq "s" -and $valueNode) {
    $index = [int]$valueNode.InnerText
    if ($index -ge 0 -and $index -lt $SharedStrings.Length) {
      return $SharedStrings[$index]
    }
  }

  if ($inlineNode) {
    return $inlineNode.InnerText
  }

  if ($valueNode) {
    return $valueNode.InnerText
  }

  return $null
}

function Get-CellMap {
  param(
    [xml]$WorksheetXml,
    [string[]]$SharedStrings
  )

  $map = @{}
  $rows = $WorksheetXml.SelectNodes("//x:sheetData/x:row", $script:ns)
  foreach ($row in $rows) {
    foreach ($cell in $row.SelectNodes("./x:c", $script:ns)) {
      $ref = $cell.GetAttribute("r")
      $formulaNode = $cell.SelectSingleNode("./x:f", $script:ns)
      $text = Get-CellText -Cell $cell -SharedStrings $SharedStrings
      $map[$ref] = [ordered]@{
        ref = $ref
        value = $text
        formula = if ($formulaNode) { $formulaNode.InnerText } else { $null }
        type = $cell.GetAttribute("t")
      }
    }
  }

  return $map
}

function Get-RowPreview {
  param(
    [xml]$WorksheetXml,
    [string[]]$SharedStrings,
    [int]$MaxRows = 15,
    [int]$MaxColumns = 15
  )

  $preview = @()
  $rows = $WorksheetXml.SelectNodes("//x:sheetData/x:row", $script:ns)
  foreach ($row in $rows | Select-Object -First $MaxRows) {
    $rowValues = [ordered]@{
      row = [int]$row.GetAttribute("r")
      cells = @()
    }
    $cells = $row.SelectNodes("./x:c", $script:ns) | Select-Object -First $MaxColumns
    foreach ($cell in $cells) {
      $formulaNode = $cell.SelectSingleNode("./x:f", $script:ns)
      $rowValues.cells += [ordered]@{
        ref = $cell.GetAttribute("r")
        value = Get-CellText -Cell $cell -SharedStrings $SharedStrings
        formula = if ($formulaNode) { $formulaNode.InnerText } else { $null }
      }
    }
    $preview += $rowValues
  }
  return $preview
}

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

function Read-EntryText {
  param(
    [System.IO.Compression.ZipArchive]$Zip,
    [string]$Path
  )

  $entry = $Zip.GetEntry($Path)
  if (-not $entry) {
    return $null
  }

  $reader = New-Object IO.StreamReader($entry.Open())
  try {
    return $reader.ReadToEnd()
  } finally {
    $reader.Close()
  }
}

New-Item -ItemType Directory -Force -Path (Split-Path $OutputPath) | Out-Null

$zip = [IO.Compression.ZipFile]::OpenRead($WorkbookPath)
try {
  $workbookXml = Read-EntryXml -Zip $zip -Path "xl/workbook.xml"
  $relsXml = Read-EntryXml -Zip $zip -Path "xl/_rels/workbook.xml.rels"
  $sharedStringsXml = Read-EntryXml -Zip $zip -Path "xl/sharedStrings.xml"

  $script:ns = New-Object System.Xml.XmlNamespaceManager($workbookXml.NameTable)
  $script:ns.AddNamespace("x", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")
  $script:ns.AddNamespace("r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")

  $relNs = New-Object System.Xml.XmlNamespaceManager($relsXml.NameTable)
  $relNs.AddNamespace("x", "http://schemas.openxmlformats.org/package/2006/relationships")

  $sharedNs = New-Object System.Xml.XmlNamespaceManager($sharedStringsXml.NameTable)
  $sharedNs.AddNamespace("x", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")

  $sharedStrings = @()
  foreach ($si in $sharedStringsXml.SelectNodes("//x:si", $sharedNs)) {
    $parts = @()
    foreach ($node in $si.SelectNodes(".//x:t", $sharedNs)) {
      $parts += $node.InnerText
    }
    $sharedStrings += ($parts -join "")
  }

  $rels = @{}
  foreach ($rel in $relsXml.SelectNodes("//x:Relationship", $relNs)) {
    $rels[$rel.Id] = $rel.Target
  }

  $definedNames = @()
  foreach ($definedName in $workbookXml.SelectNodes("//x:definedNames/x:definedName", $script:ns)) {
    $definedNames += [ordered]@{
      name = $definedName.GetAttribute("name")
      localSheetId = $definedName.GetAttribute("localSheetId")
      hidden = $definedName.GetAttribute("hidden")
      reference = $definedName.InnerText
    }
  }

  $sheets = @()
  foreach ($sheet in $workbookXml.SelectNodes("//x:sheets/x:sheet", $script:ns)) {
    $rid = $sheet.GetAttribute("r:id")
    $target = $rels[$rid]
    $sheetPath = "xl/" + $target.Replace("\", "/")
    $sheetXml = Read-EntryXml -Zip $zip -Path $sheetPath
    $sheetNs = New-Object System.Xml.XmlNamespaceManager($sheetXml.NameTable)
    $sheetNs.AddNamespace("x", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")

    $dimension = $sheetXml.SelectSingleNode("//x:dimension", $sheetNs)
    $sheetRows = $sheetXml.SelectNodes("//x:sheetData/x:row", $sheetNs)
    $formulaCells = $sheetXml.SelectNodes("//x:c[x:f]", $sheetNs)
    $validationNodes = $sheetXml.SelectNodes("//x:dataValidations/x:dataValidation", $sheetNs)
    $mergeCells = $sheetXml.SelectNodes("//x:mergeCells/x:mergeCell", $sheetNs)

    $validationPreview = @()
    foreach ($validation in $validationNodes | Select-Object -First 20) {
      $formula1 = $validation.SelectSingleNode("./x:formula1", $sheetNs)
      $formula2 = $validation.SelectSingleNode("./x:formula2", $sheetNs)
      $validationPreview += [ordered]@{
        type = $validation.GetAttribute("type")
        sqref = $validation.GetAttribute("sqref")
        formula1 = if ($formula1) { $formula1.InnerText } else { $null }
        formula2 = if ($formula2) { $formula2.InnerText } else { $null }
      }
    }

    $formulaPreview = @()
    foreach ($cell in $formulaCells | Select-Object -First 50) {
      $formulaPreview += [ordered]@{
        ref = $cell.GetAttribute("r")
        formula = $cell.SelectSingleNode("./x:f", $sheetNs).InnerText
        value = Get-CellText -Cell $cell -SharedStrings $sharedStrings
      }
    }

    $sheets += [ordered]@{
      name = $sheet.GetAttribute("name")
      state = $sheet.GetAttribute("state")
      dimension = if ($dimension) { $dimension.GetAttribute("ref") } else { $null }
      rowCount = $sheetRows.Count
      formulaCount = $formulaCells.Count
      validationCount = $validationNodes.Count
      mergedCellCount = $mergeCells.Count
      rowPreview = Get-RowPreview -WorksheetXml $sheetXml -SharedStrings $sharedStrings
      validationPreview = $validationPreview
      formulaPreview = $formulaPreview
    }
  }

  $result = [ordered]@{
    workbookPath = $WorkbookPath
    analyzedAt = (Get-Date).ToString("s")
    sheetCount = $sheets.Count
    definedNameCount = $definedNames.Count
    sheets = $sheets
    definedNames = $definedNames
  }

  $json = $result | ConvertTo-Json -Depth 8
  Set-Content -Path $OutputPath -Value $json -Encoding UTF8
  Write-Output "Saved analysis to $OutputPath"
} finally {
  $zip.Dispose()
}
