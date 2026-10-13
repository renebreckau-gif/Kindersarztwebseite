# Clean-database proof for the Praxis Cockpit backend (Phase 09.3). Local only.
#
#   npm run build ; npm run test:db:clean
#
# From ZERO, against the isolated dev cluster (127.0.0.1:5433, scripts/db-dev.ps1):
#   1. drop + create an EMPTY database kinderarzt_staging_test (owner kinderarzt_app)
#   2. apply migrations with the Payload CLI, show migration status
#   3. start the built app (next start) on port 3200 against that database
#   4. integration step 1: empty database — no first-user registration via any route
#   5. create the first ADMIN with the REAL bootstrap script (generated password, never printed)
#   6. integration step 2: accounts, auth over HTTP, roles, provenance, audit, transactions
#   7. integration step 3: static -> PostgreSQL -> repository parity
#   8. integration step 4: real cockpit read experience (/intern, /intern/vorschau)
# Secrets are read from the git-ignored .env.local and never printed.

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root
$Psql = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
$Port = 3200
$Base = "http://localhost:$Port"

$vals = @{}
Get-Content (Join-Path $Root ".env.local") | Where-Object { $_ -match '^[A-Z0-9_]+=' } | ForEach-Object { $k, $v = $_ -split '=', 2; $vals[$k] = $v }
foreach ($k in @("TEST_DATABASE_URI", "DEV_DB_SUPERUSER_URI", "PAYLOAD_SECRET")) { if (-not $vals[$k]) { throw "$k missing in .env.local (run scripts/db-dev.ps1 init)" } }
$test = [Uri]$vals.TEST_DATABASE_URI
$db = $test.AbsolutePath.TrimStart("/")
if ($test.Host -ne "127.0.0.1" -or -not $db.EndsWith("_test")) { throw "TEST_DATABASE_URI must be a loopback *_test database." }
$super = [Uri]$vals.DEV_DB_SUPERUSER_URI
$superUser, $superPw = [Uri]::UnescapeDataString($super.UserInfo) -split ":", 2
$appUser = ([Uri]::UnescapeDataString($test.UserInfo) -split ":", 2)[0]

function Invoke-Super([string]$sql, [string]$database = "postgres") {
  $env:PGPASSWORD = $superPw
  try { & $Psql -w -v ON_ERROR_STOP=1 -q -h $super.Host -p $super.Port -U $superUser -d $database -c $sql | Out-Null; if ($LASTEXITCODE -ne 0) { throw "psql failed" } }
  finally { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
}

Write-Host "1/8 fresh empty database $db"
Invoke-Super "DROP DATABASE IF EXISTS $db WITH (FORCE);"
Invoke-Super "CREATE DATABASE $db OWNER $appUser ENCODING 'UTF8';"
Invoke-Super "ALTER SCHEMA public OWNER TO $appUser; REVOKE ALL ON DATABASE $db FROM PUBLIC;" $db

$env:DATABASE_URI = $vals.TEST_DATABASE_URI
$env:TEST_DATABASE_URI = $vals.TEST_DATABASE_URI
$env:E2E_BASE_URL = $Base
$env:PAYLOAD_SECRET = $vals.PAYLOAD_SECRET
$server = $null
$failed = 0
try {
  Write-Host "2/8 migrations (Payload CLI)"
  & npx payload migrate 2>&1 | Where-Object { "$_" -match "Migrat|Done|Error" } | ForEach-Object { "   $_" }
  if ($LASTEXITCODE -ne 0) { throw "migrate failed" }
  & npx payload migrate:status 2>&1 | Where-Object { "$_" -match "initial|Error" } | ForEach-Object { "   $_" }

  Write-Host "3/8 start app on $Base against $db"
  $log = Join-Path $env:TEMP "kinderarzt-test-server.log"
  $server = Start-Process -FilePath "node" -ArgumentList "node_modules/next/dist/bin/next", "start", "-p", "$Port" -WorkingDirectory $Root -RedirectStandardOutput $log -RedirectStandardError "$log.err" -WindowStyle Hidden -PassThru
  $ready = $false
  for ($i = 0; $i -lt 60 -and -not $ready; $i++) { Start-Sleep -Milliseconds 500; try { $ready = (Invoke-WebRequest -UseBasicParsing "$Base/review" -TimeoutSec 5).StatusCode -eq 200 } catch { } }
  if (-not $ready) { throw "server did not start (see $log)" }

  Write-Host "4/8 integration: empty database"
  & node --test --test-force-exit --test-concurrency=1 "src/backend/__integration__/01-empty-database.test.ts"
  if ($LASTEXITCODE -ne 0) { $failed++ }

  Write-Host "5/8 bootstrap first ADMIN (real script, generated password)"
  $bytes = New-Object byte[] 24; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $env:BOOTSTRAP_ADMIN_EMAIL = "verwaltung@integration-test.invalid"
  $env:BOOTSTRAP_ADMIN_NAME = "Test Verwaltung (künstlich)"
  $env:BOOTSTRAP_ADMIN_PASSWORD = "Bt-" + [Convert]::ToBase64String($bytes).Replace("/", "_").Replace("+", "-") + "-9a"
  & node scripts/bootstrap-admin.ts 2>&1 | Where-Object { "$_" -notmatch "email adapter" } | ForEach-Object { "   $_" }
  if ($LASTEXITCODE -ne 0) { throw "bootstrap failed" }
  $env:E2E_ADMIN_EMAIL = $env:BOOTSTRAP_ADMIN_EMAIL
  $env:E2E_ADMIN_PASSWORD = $env:BOOTSTRAP_ADMIN_PASSWORD
  Remove-Item Env:BOOTSTRAP_ADMIN_EMAIL, Env:BOOTSTRAP_ADMIN_NAME, Env:BOOTSTRAP_ADMIN_PASSWORD

  Write-Host "6/8 integration: runtime, auth, roles, provenance, audit, transactions"
  & node --test --test-force-exit --test-concurrency=1 "src/backend/__integration__/02-runtime.test.ts"
  if ($LASTEXITCODE -ne 0) { $failed++ }

  Write-Host "7/8 integration: static -> PostgreSQL -> repository parity"
  & node --test --test-force-exit --test-concurrency=1 "src/backend/__integration__/03-parity.test.ts"
  if ($LASTEXITCODE -ne 0) { $failed++ }

  Write-Host "8/8 integration: real cockpit read experience"
  & node --test --test-force-exit --test-concurrency=1 "src/backend/__integration__/04-cockpit.test.ts"
  if ($LASTEXITCODE -ne 0) { $failed++ }
}
finally {
  if ($server) { & taskkill /PID $server.Id /T /F 2>&1 | Out-Null }
  Remove-Item Env:E2E_ADMIN_PASSWORD, Env:E2E_ADMIN_EMAIL, Env:DATABASE_URI, Env:PAYLOAD_SECRET -ErrorAction SilentlyContinue
}
if ($failed) { Write-Host "FAILED: $failed integration step(s)"; exit 1 }
Write-Host "All integration steps passed (clean database from zero)."
