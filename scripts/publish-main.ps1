# Run in a normal PowerShell terminal with Git access to this folder's .git directory.
# Sync:    powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/publish-main.ps1 -SyncOnly
# Publish: powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/publish-main.ps1 -Message "Describe the change" -Paths content/post/example.md,static/image.png
[CmdletBinding()]
param(
    [string]$Message,
    [string]$Paths,
    [switch]$SyncOnly
)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)

function Invoke-Git {
    param([string[]]$GitArgs)
    $result = & git @GitArgs
    if ($LASTEXITCODE -ne 0) { throw "Git failed: git $($GitArgs -join ' ')" }
    return $result
}

function Test-Ancestor {
    param([string]$Earlier, [string]$Later)
    & git merge-base --is-ancestor $Earlier $Later
    if ($LASTEXITCODE -eq 0) { return $true }
    if ($LASTEXITCODE -eq 1) { return $false }
    throw "Cannot compare commits $Earlier and $Later."
}

function Assert-Remote {
    $localCommit = (Invoke-Git @('rev-parse', 'HEAD')).Trim()
    $remoteCommit = (Invoke-Git @('rev-parse', 'origin/main')).Trim()
    Write-Host "Local main:  $localCommit"
    Write-Host "Origin/main: $remoteCommit"
    Write-Host 'Working changes:'
    $changes = @(Invoke-Git @('status', '--short'))
    if ($changes.Count -eq 0) { Write-Host '  (none)' } else { $changes | ForEach-Object { Write-Host "  $_" } }
    if ($localCommit -ne $remoteCommit) { throw 'Local main and origin/main do not match.' }
}

if ((Invoke-Git @('branch', '--show-current')).Trim() -ne 'main') {
    throw 'Switch to the local main branch before publishing.'
}
if (@(Invoke-Git @('diff', '--cached', '--name-only')).Count -gt 0) {
    throw 'Staged changes exist. Commit or unstage them before using this command.'
}
if (-not $SyncOnly -and ([string]::IsNullOrWhiteSpace($Message) -or [string]::IsNullOrWhiteSpace($Paths))) {
    throw 'Publishing requires -Message and an explicit -Paths list. Use -SyncOnly to synchronize without committing.'
}
$selectedPaths = @($Paths -split ',' | ForEach-Object { $_.Trim() })

# Fetch before editing the index. If remote is ahead, preserve the current working tree.
[void](Invoke-Git @('fetch', 'origin', 'main'))
$localCommit = (Invoke-Git @('rev-parse', 'HEAD')).Trim()
$remoteCommit = (Invoke-Git @('rev-parse', 'origin/main')).Trim()
if ($localCommit -ne $remoteCommit) {
    if (Test-Ancestor $localCommit $remoteCommit) {
        $dirty = @(Invoke-Git @('status', '--porcelain', '--untracked-files=normal')).Count -gt 0
        if (-not $dirty) {
            [void](Invoke-Git @('merge', '--ff-only', 'origin/main'))
        } else {
            # When published files already exist verbatim in the working tree, only
            # the local branch/index need moving. A mixed reset never edits files.
            $publishedFilesPresent = $true
            $changedPaths = @(Invoke-Git @('diff', '--name-only', 'HEAD', 'origin/main', '--'))
            foreach ($path in $changedPaths) {
                $entry = @(Invoke-Git @('ls-tree', 'origin/main', '--', $path)) -join ''
                if ($entry -notmatch '^100644 blob ([0-9a-f]{40})\s') {
                    $publishedFilesPresent = $false
                    break
                }
                $wanted = $Matches[1]
                if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
                    $publishedFilesPresent = $false
                    break
                }
                $actual = (Invoke-Git @('hash-object', "--path=$path", '--', $path)).Trim()
                if ($actual -ne $wanted) { $publishedFilesPresent = $false; break }
            }
            if ($publishedFilesPresent) {
                $checkpoint = 'backup/before-local-sync-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
                [void](Invoke-Git @('branch', $checkpoint, 'HEAD'))
                [void](Invoke-Git @('reset', '--mixed', 'origin/main'))
                Write-Host "Preserved old HEAD at $checkpoint. Working files were not touched."
            } else {
                # Preserve unrelated edits while updating files from the remote.
                # If applying edits conflicts, keep the stash for manual recovery.
                $stashBefore = (& git rev-parse -q --verify refs/stash 2>$null)
                [void](Invoke-Git @('stash', 'push', '--include-untracked', '-m', 'publish-main: preserve working changes'))
                $stashAfter = (& git rev-parse -q --verify refs/stash 2>$null)
                $createdStash = $stashAfter -and ($stashAfter -ne $stashBefore)
                [void](Invoke-Git @('merge', '--ff-only', 'origin/main'))
                if ($createdStash) {
                    try {
                        [void](Invoke-Git @('stash', 'apply', '--index', $stashAfter))
                    } catch {
                        throw "Remote files were updated, but applying your edits conflicted. Your backup is stash $stashAfter. Resolve the conflict before publishing. $($_.Exception.Message)"
                    }
                    [void](Invoke-Git @('stash', 'drop', 'stash@{0}'))
                }
            }
        }
    } elseif (-not (Test-Ancestor $remoteCommit $localCommit)) {
        throw 'Local main and origin/main have diverged; resolve their history before publishing.'
    }
}

if ($SyncOnly) {
    Assert-Remote
    return
}

# Stage only the files chosen for this publish; leave generated pages and submodules alone.
foreach ($path in $selectedPaths) {
    $normalized = $path.Replace('\', '/')
    if ([string]::IsNullOrWhiteSpace($path) -or $normalized -eq '.' -or
        $normalized.StartsWith('/') -or $normalized -match '(^|/)\.\.?(/|$)' -or
        $normalized -match '^[A-Za-z]:' -or
        $normalized -match '^(public/|themes/anatole(?:/|$)|\.git(?:/|$))' -or
        (Test-Path -LiteralPath $path -PathType Container)) {
        throw "Unsafe path: $path. Name individual source files, not directories, generated pages, or submodules."
    }
}
[void](Invoke-Git (@('add', '--') + $selectedPaths))
$staged = @(Invoke-Git @('diff', '--cached', '--name-only'))
if ($staged.Count -eq 0) {
    $currentHead = (Invoke-Git @('rev-parse', 'HEAD')).Trim()
    $currentRemote = (Invoke-Git @('rev-parse', 'origin/main')).Trim()
    if ($currentHead -ne $currentRemote -and (Test-Ancestor $currentRemote $currentHead)) {
        Write-Host "Retrying push of existing local commit $currentHead."
        [void](Invoke-Git @('push', 'origin', 'HEAD:main'))
        [void](Invoke-Git @('fetch', 'origin', 'main'))
        Assert-Remote
        return
    }
    Write-Host 'The selected files already match the current commit; nothing new to publish.'
    Assert-Remote
    return
}
Write-Host "Committing: $($staged -join ', ')"
[void](Invoke-Git @('commit', '-m', $Message))
$publishedCommit = (Invoke-Git @('rev-parse', 'HEAD')).Trim()
[void](Invoke-Git @('push', 'origin', 'HEAD:main'))
[void](Invoke-Git @('fetch', 'origin', 'main'))
Assert-Remote
Write-Host "Published local commit $publishedCommit to origin/main."
