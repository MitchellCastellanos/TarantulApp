# Retry joining beta testers to the Play closed-testing Google Group (Admin SDK Directory API).
# Requires DB_* , GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY,
# GOOGLE_ADMIN_IMPERSONATE_EMAIL, GOOGLE_TESTERS_GROUP_EMAIL.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $Root "backend")
& mvn -q spring-boot:run "-Dspring-boot.run.profiles=sync-google-group"
exit $LASTEXITCODE
