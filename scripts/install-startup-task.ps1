$ErrorActionPreference = "Stop"

$TaskName = "OktatasiNaploServer"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectPath = Split-Path -Parent $ScriptDir
$StartScript = Join-Path $ScriptDir "start-server.ps1"

if (-not (Test-Path $StartScript)) {
  throw "Nem található az indító script: $StartScript"
}

$Node = Get-Command node -ErrorAction SilentlyContinue
if (-not $Node) {
  throw "A Node.js nem található. Telepítsd a Node.js LTS verziót, majd futtasd újra ezt a scriptet."
}

$PackageJson = Join-Path $ProjectPath "package.json"
if (-not (Test-Path $PackageJson)) {
  throw "Nem található package.json a projekt gyökerében: $ProjectPath"
}

$Action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$StartScript`""

$Trigger = New-ScheduledTaskTrigger -AtStartup

$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $Action `
  -Trigger $Trigger `
  -Settings $Settings `
  -Description "Oktatási napló szerver automatikus indítása gépindításkor" `
  -Force | Out-Null

Write-Host "Feladat létrehozva vagy frissítve: $TaskName"
Write-Host "Projekt: $ProjectPath"
Write-Host "Indító script: $StartScript"
Write-Host "Kézi indítás teszthez: Start-ScheduledTask -TaskName `"$TaskName`""
