# Package Chrome Extension (MV3)
# Usage: Run this script in PowerShell. It will create a clean ZIP ready for Chrome Web Store upload.

$ErrorActionPreference = 'Stop'

# Paths
$repoRoot = Split-Path -Parent $PSScriptRoot
$distDir = Join-Path $PSScriptRoot 'dist'
$zipName = 'tecso-seo-analyzer.zip'
$zipPath = Join-Path $PSScriptRoot $zipName

# Clean previous
if (Test-Path $distDir) { Remove-Item -Recurse -Force $distDir }
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }

# Create dist
New-Item -ItemType Directory -Force -Path $distDir | Out-Null

# Files to include
$include = @(
  'manifest.json',
  'background.js',
  'content.js',
  'popup.html',
  'popup_app.js',
  'icons'
)

foreach ($item in $include) {
  $src = Join-Path $repoRoot $item
  $dst = Join-Path $distDir $item
  if (Test-Path $src) {
    if ((Get-Item $src).PSIsContainer) {
      Copy-Item -Recurse -Force $src $dst
    } else {
      $dstParent = Split-Path -Parent $dst
      if (!(Test-Path $dstParent)) { New-Item -ItemType Directory -Force -Path $dstParent | Out-Null }
      Copy-Item -Force $src $dst
    }
  } else {
    Write-Warning "Missing: $item"
  }
}

# Optional: prune dev-only files from dist (none specified here)

# Zip it
Add-Type -AssemblyName 'System.IO.Compression.FileSystem'
[System.IO.Compression.ZipFile]::CreateFromDirectory($distDir, $zipPath)

Write-Host "Created package: $zipPath" -ForegroundColor Green
