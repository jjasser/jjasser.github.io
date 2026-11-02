# One-time setup. Run from the normal Windows account that owns the Git checkout.
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$queue = Join-Path $repo 'validation/auto-publish'
$taskName = 'JjasserBlogLocalPublish'
New-Item -ItemType Directory -Path $queue -Force | Out-Null

$worker = Join-Path $PSScriptRoot 'auto-publish.ps1'
$powershell = Join-Path $PSHOME 'powershell.exe'
$action = New-ScheduledTaskAction -Execute $powershell -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$worker`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 2) -RepetitionDuration (New-TimeSpan -Days 3650)
$principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Sync and publish the blog from the local Git checkout.' -Force | Out-Null

# The first run syncs the previously published theme files, commits the new
# workflow locally, and pushes that commit. Existing unrelated edits remain.
$pending = Join-Path $queue 'pending.json'
$running = Join-Path $queue 'running.json'
if (-not (Test-Path -LiteralPath $pending) -and -not (Test-Path -LiteralPath $running)) {
    @{
        message = 'Automate local-first blog publishing'
        paths = @(
            'AGENTS.md',
            'scripts/publish-main.ps1',
            'scripts/auto-publish.ps1',
            'scripts/install-auto-publish.ps1',
            'scripts/install-auto-publish.cmd',
            'scripts/AUTO-PUBLISH.md'
        )
    } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $pending -Encoding UTF8
}
Start-ScheduledTask -TaskName $taskName
Write-Host "Automatic publishing is installed for this Windows account. Results: $queue\last-result.json"
