param([string]$WorkspaceRoot = $(if ($env:ASTRADESK_WORKSPACE) { $env:ASTRADESK_WORKSPACE } else { Join-Path $PSScriptRoot '..\..\AstraDesk-Dev' }))
$ErrorActionPreference = 'Stop'
$sourceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$workspaceFull = [IO.Path]::GetFullPath($WorkspaceRoot)
$targets = @((Join-Path $sourceRoot 'dist'), (Join-Path $workspaceFull '.build'), (Join-Path $workspaceFull '.validation'))
Add-Type -AssemblyName Microsoft.VisualBasic
foreach ($target in $targets) {
    if (!(Test-Path -LiteralPath $target)) { continue }
    $entry = Get-Item -LiteralPath $target
    if ($entry.LinkType -or !$entry.PSIsContainer -or $entry.FullName -notin $targets) { throw 'Unexpected generated directory' }
    [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($entry.FullName, [Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs, [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)
    Write-Output "Recycled generated directory: $($entry.FullName)"
}
# Explicit allowlist excludes dependencies, tools, releases, installed software and user data.
