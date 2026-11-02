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
        # A worker may restart after a successful push but before removing the
        # request. Recognize the exact committed paths instead of re-staging a
        # deleted file (such as AGENTS.md) and retrying forever.
        & git -C $repo fetch origin main | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Could not refresh origin/main before checking the request.' }
        $head = (& git -C $repo rev-parse HEAD).Trim()
        $origin = (& git -C $repo rev-parse origin/main).Trim()
        $subject = (& git -C $repo log -1 --format=%s).Trim()
        $committedPaths = @(& git -C $repo diff-tree --no-commit-id --name-only -r HEAD)
        $alreadyPublished = $head -eq $origin -and $subject -eq [string]$job.message
        foreach ($path in $job.paths) {
            if ($path -notin $committedPaths) { $alreadyPublished = $false; break }
        }
        if (-not $alreadyPublished) {
            & $publish -Message ([string]$job.message) -Paths ($job.paths -join ',') | Out-Null
        }
    } else {
        & $publish -SyncOnly | Out-Null
    }

    $localCommit = (& git -C $repo rev-parse HEAD).Trim()
    $remoteCommit = (& git -C $repo rev-parse origin/main).Trim()
    if ($localCommit -ne $remoteCommit) { throw 'Local and origin/main commits differ after publishing.' }

    # Hugo can rewrite tracked public files with different checkout line endings.
    # Refresh Git's index only when the normalized blob is identical to HEAD.
    # Real generated-page changes remain visible for review.
    $generatedPaths = @(& git -C $repo ls-files -m -- public)
    foreach ($path in $generatedPaths) {
        $committedBlob = (& git -C $repo rev-parse "HEAD:$path").Trim()
        $workingBlob = (& git -C $repo hash-object "--path=$path" -- $path).Trim()
        if ($committedBlob -eq $workingBlob) {
            & git -C $repo add -- $path | Out-Null
            if ($LASTEXITCODE -ne 0) { throw "Could not refresh the index for $path." }
        }
    }

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
