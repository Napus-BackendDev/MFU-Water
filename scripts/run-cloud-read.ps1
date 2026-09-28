[CmdletBinding()]
param([switch]$Map)
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$guardPath = Join-Path (Split-Path $taskRoot -Parent) '.agents\scripts\invoke-guarded.ps1'
$diagnosticPath = Join-Path $taskRoot $(if ($Map) { 'scripts\serve-cloud-read.mjs' } else { 'scripts\check-cloud-read.mjs' })
$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
$taskId = 'mfu-cloud-read-' + [Guid]::NewGuid().ToString('N')
$grantPath = Join-Path $taskRoot ($taskId + '.approval.json')
$originalUrl = $env:SUPABASE_URL
$originalKey = $env:SUPABASE_SERVICE_ROLE_KEY
$originalMode = $env:NODE_ENV

try {
    # Values live only in this process and its guarded child, never in files or CLI arguments.
    if (-not $env:SUPABASE_URL) { $env:SUPABASE_URL = Read-Host 'Supabase project URL (HTTPS, no /rest/v1 suffix)' }
    $targetUrl = [Uri]$env:SUPABASE_URL
    if ($targetUrl.Scheme -ne 'https' -or $targetUrl.Host -notmatch '^[a-z0-9]+\.supabase\.co$' -or $targetUrl.UserInfo -or -not $targetUrl.IsDefaultPort -or $targetUrl.AbsolutePath -ne '/' -or $targetUrl.Query -or $targetUrl.Fragment) {
        throw 'approved_target_mismatch'
    }
    if (-not $env:SUPABASE_SERVICE_ROLE_KEY) {
        $protectedKey = Read-Host 'Service role / secret key (hidden; memory only)' -AsSecureString
        $keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($protectedKey)
        try { $env:SUPABASE_SERVICE_ROLE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer) }
        finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer); $protectedKey.Dispose() }
    }
    $env:NODE_ENV = 'production'
    $parameters = @{
        TaskId = $taskId; ProjectId = 'mfu-water-7308d513'; MutationRoot = $taskRoot
        WorkingDirectory = $taskRoot; ActionClass = 'database-read'; Environment = 'production'
        DatabaseHost = $targetUrl.Host; DatabaseName = 'postgres'; Executable = $nodePath
        ArgumentList = @($diagnosticPath, '--expected-host', $targetUrl.Host)
        ApprovalGrantPath = $grantPath; TimeoutSeconds = $(if ($Map) { 3600 } else { 90 }); MaxOutputChars = 4096
    }
    if ($Map) { Write-Host 'Read-only map API for up to 55 minutes. No writes, admin, email, or contact details.' }
    else { Write-Host 'Read-only counts. No database writes, email, contact details, or application startup.' }
    & $guardPath @parameters -RequestApproval
    if ($LASTEXITCODE -ne 0) { throw 'approval_not_issued' }
    if ($Map) { Write-Host 'After startup open http://127.0.0.1:4180/#water-watch and keep this terminal open.' }
    & $guardPath @parameters -Execute
    if ($LASTEXITCODE -ne 0) { throw 'cloud_read_failed' }
} finally {
    $env:SUPABASE_URL = $originalUrl
    $env:SUPABASE_SERVICE_ROLE_KEY = $originalKey
    $env:NODE_ENV = $originalMode
}
