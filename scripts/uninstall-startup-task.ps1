$ErrorActionPreference = "Stop"

$TaskName = "OktatasiNaploServer"

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Host "Feladat törölve: $TaskName"
} else {
  Write-Host "Nincs ilyen feladat: $TaskName"
}
