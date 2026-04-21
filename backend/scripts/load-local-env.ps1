param(
  [string]$EnvFile = ".\database.local.env"
)

if (!(Test-Path $EnvFile)) {
  Write-Error "No se encontro el archivo: $EnvFile"
  exit 1
}

Get-Content $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -eq "" -or $line.StartsWith("#")) { return }
  $parts = $line -split '=', 2
  if ($parts.Count -ne 2) { return }
  $name = $parts[0].Trim()
  $value = $parts[1].Trim()
  Set-Item -Path "Env:$name" -Value $value
}

Write-Host "Variables cargadas desde $EnvFile"
Write-Host "SPRING_PROFILES_ACTIVE=$env:SPRING_PROFILES_ACTIVE"
