$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectPath = Split-Path -Parent $ScriptDir
$LogDir = Join-Path $ProjectPath "logs"
$LogPath = Join-Path $LogDir "server.log"

if (-not (Test-Path $LogDir)) {
  New-Item -ItemType Directory -Path $LogDir | Out-Null
}

Set-Location $ProjectPath

"[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Szerver indítása: $ProjectPath" |
  Out-File -FilePath $LogPath -Append -Encoding utf8

try {
  npm start *>> $LogPath
} catch {
  "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Hiba: $($_.Exception.Message)" |
    Out-File -FilePath $LogPath -Append -Encoding utf8
  throw
}
