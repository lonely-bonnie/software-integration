param([string]$RuntimeRoot = (Join-Path $PSScriptRoot '..\..\RiderConsole'))
$ErrorActionPreference = 'Stop'
$sourceRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$runtimeFull = [IO.Path]::GetFullPath($RuntimeRoot)
$developmentRoot = Join-Path $runtimeFull 'development'
$dependencyPath = Join-Path $developmentRoot 'node_modules'
$sourceDependencyPath = Join-Path $sourceRoot 'node_modules'
if (Test-Path -LiteralPath $sourceDependencyPath) {
    $entry = Get-Item -LiteralPath $sourceDependencyPath
    if ($entry.LinkType -ne 'Junction' -or $entry.Target -ne $dependencyPath) {
        throw 'The source node_modules directory already exists. This script does not replace existing dependency folders.'
    }
}
New-Item -ItemType Directory -Path $developmentRoot -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $sourceRoot 'package.json') -Destination $developmentRoot
Copy-Item -LiteralPath (Join-Path $sourceRoot 'package-lock.json') -Destination $developmentRoot
$taskElectronCache = $env:ELECTRON_CACHE
try {
    $env:ELECTRON_CACHE = Join-Path $runtimeFull 'tooling\electron-cache'
    & npm.cmd ci --prefix $developmentRoot --cache (Join-Path $runtimeFull 'tooling\npm-cache') --no-fund --no-audit
    if ($LASTEXITCODE -ne 0) { throw 'Isolated dependency installation failed' }
} finally { $env:ELECTRON_CACHE = $taskElectronCache }
if (!(Test-Path -LiteralPath $sourceDependencyPath)) {
    New-Item -ItemType Junction -Path $sourceDependencyPath -Target $dependencyPath | Out-Null
}
Write-Output "Development dependencies: $dependencyPath"
