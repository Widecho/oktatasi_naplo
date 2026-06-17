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
  $Node = Get-Command node -ErrorAction Stop
  $Npm = Get-Command npm.cmd -ErrorAction Stop

  "Node: $($Node.Source)" | Out-File -FilePath $LogPath -Append -Encoding utf8
  "npm: $($Npm.Source)" | Out-File -FilePath $LogPath -Append -Encoding utf8

  & $Npm.Source start *>> $LogPath
} catch {
  "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Hiba: $($_.Exception.Message)" |
    Out-File -FilePath $LogPath -Append -Encoding utf8
  throw
}
