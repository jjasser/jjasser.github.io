# Scheduled worker. An assistant queues explicit source paths in
# validation/auto-publish/pending.json; this task commits and pushes locally.
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$queue = Join-Path $repo 'validation/auto-publish'
$pending = Join-Path $queue 'pending.json'
$running = Join-Path $queue 'running.json'
$resultFile = Join-Path $queue 'last-result.json'
$publish = Join-Path $PSScriptRoot 'publish-main.ps1'
New-Item -ItemType Directory -Path $queue -Force | Out-Null

$mutex = [System.Threading.Mutex]::new($false, 'Local\JjasserBlogAutoPublish')
if (-not $mutex.WaitOne(0)) { exit 0 }
try {
    if (-not (Test-Path -LiteralPath $running)) {
        if (Test-Path -LiteralPath $pending) {
            Move-Item -LiteralPath $pending -Destination $running
        }
    }
    $hasJob = Test-Path -LiteralPath $running
    $job = $null
    if ($hasJob) {
        $job = Get-Content -LiteralPath $running -Raw | ConvertFrom-Json
        if ([string]::IsNullOrWhiteSpace([string]$job.message) -or @($job.paths).Count -eq 0) {
            throw 'Publish request needs a message and an array of source paths.'
        }
        & $publish -Message ([string]$job.message) -Paths ($job.paths -join ',') | Out-Null
    } else {
        & $publish -SyncOnly | Out-Null
    }

    $localCommit = (& git -C $repo rev-parse HEAD).Trim()
    $remoteCommit = (& git -C $repo rev-parse origin/main).Trim()
    if ($localCommit -ne $remoteCommit) { throw 'Local and origin/main commits differ after publishing.' }
    $receipt = @{
        success = $true
        finishedAt = (Get-Date).ToString('o')
        message = if ($hasJob) { [string]$job.message } else { 'Automatic sync' }
        localCommit = $localCommit
        remoteCommit = $remoteCommit
        remainingChanges = @(& git -C $repo status --short)
    }
    $receipt | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $resultFile -Encoding UTF8
    if ($hasJob) { Remove-Item -LiteralPath $running }
} catch {
    @{
        success = $false
        finishedAt = (Get-Date).ToString('o')
        error = $_.Exception.Message
        request = if (Test-Path -LiteralPath $running) { $running } else { $null }
    } | ConvertTo-Json | Set-Content -LiteralPath $resultFile -Encoding UTF8
    throw
} finally {
    $mutex.ReleaseMutex()
    $mutex.Dispose()
}
