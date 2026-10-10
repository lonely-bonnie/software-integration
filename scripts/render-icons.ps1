param(
  [Parameter(Mandatory = $true)][string]$ElectronPath,
  [Parameter(Mandatory = $true)][string]$ScriptPath,
  [Parameter(Mandatory = $true)][string]$ProjectPath
)
$ErrorActionPreference = 'Stop'
$iconProcess = Start-Process -FilePath $ElectronPath -ArgumentList ('"' + $ScriptPath + '"'), '--render' -WorkingDirectory $ProjectPath -WindowStyle Hidden -PassThru
$iconProcess.WaitForExit()
exit $iconProcess.ExitCode
