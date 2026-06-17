$ErrorActionPreference = "Stop"

$TaskName = "OktatasiNaploServer"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectPath = Split-Path -Parent $ScriptDir
$StartScript = Join-Path $ScriptDir "start-server.ps1"
$CurrentUser = "$env:USERDOMAIN\$env:USERNAME"

if (-not (Test-Path $StartScript)) {
  throw "Nem található az indító script: $StartScript"
}

$Node = Get-Command node -ErrorAction SilentlyContinue
if (-not $Node) {
  throw "A Node.js nem található. Telepítsd a Node.js LTS verziót, majd futtasd újra ezt a scriptet."
}

$Npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $Npm) {
  throw "Az npm.cmd nem található. Ellenőrizd a Node.js telepítést, majd nyiss új PowerShell ablakot."
}

$PackageJson = Join-Path $ProjectPath "package.json"
if (-not (Test-Path $PackageJson)) {
  throw "Nem található package.json a projekt gyökerében: $ProjectPath"
}

$Action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$StartScript`"" `
  -WorkingDirectory $ProjectPath

$Trigger = New-ScheduledTaskTrigger -AtLogOn -User $CurrentUser
$Principal = New-ScheduledTaskPrincipal `
  -UserId $CurrentUser `
  -LogonType Interactive `
  -RunLevel LeastPrivilege

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
  -Principal $Principal `
  -Settings $Settings `
  -Description "Oktatási napló szerver automatikus indítása felhasználói bejelentkezéskor" `
  -Force | Out-Null

Write-Host "Feladat létrehozva vagy frissítve: $TaskName"
Write-Host "Projekt: $ProjectPath"
Write-Host "Indító script: $StartScript"
Write-Host "Felhasználó: $CurrentUser"
Write-Host "Kézi indítás teszthez: Start-ScheduledTask -TaskName `"$TaskName`""
