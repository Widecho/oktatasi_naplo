$ErrorActionPreference = "Stop"

$StartupDir = [Environment]::GetFolderPath("Startup")
$ShortcutPath = Join-Path $StartupDir "Oktatasi Naplo Server.lnk"

if (Test-Path $ShortcutPath) {
  Remove-Item -LiteralPath $ShortcutPath -Force
  Write-Host "Startup parancsikon törölve:"
  Write-Host $ShortcutPath
} else {
  Write-Host "Nincs ilyen Startup parancsikon:"
  Write-Host $ShortcutPath
}
