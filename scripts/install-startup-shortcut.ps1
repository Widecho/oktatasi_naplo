$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectPath = Split-Path -Parent $ScriptDir
$StartScript = Join-Path $ScriptDir "start-server.ps1"
$StartupDir = [Environment]::GetFolderPath("Startup")
$ShortcutPath = Join-Path $StartupDir "Oktatasi Naplo Server.lnk"

if (-not (Test-Path $StartScript)) {
  throw "Nem található az indító script: $StartScript"
}

$Node = Get-Command node -ErrorAction SilentlyContinue
if (-not $Node) {
  throw "A Node.js nem található. Telepítsd a Node.js LTS verziót, majd nyiss új PowerShell ablakot."
}

$Npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $Npm) {
  throw "Az npm.cmd nem található. Ellenőrizd a Node.js telepítést, majd nyiss új PowerShell ablakot."
}

$Shell = New-Object -ComObject WScript.Shell
$Shortcut = $Shell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$StartScript`""
$Shortcut.WorkingDirectory = $ProjectPath
$Shortcut.Description = "Oktatási napló szerver indítása bejelentkezéskor"
$Shortcut.Save()

Write-Host "Startup parancsikon létrehozva:"
Write-Host $ShortcutPath
Write-Host "A szerver a következő bejelentkezéskor automatikusan indul."
Write-Host "Kézi teszt: futtasd ezt: .\scripts\start-server.ps1"
