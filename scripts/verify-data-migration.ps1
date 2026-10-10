param([string]$WorkspaceRoot = $(if ($env:ASTRADESK_WORKSPACE) { $env:ASTRADESK_WORKSPACE } else { Join-Path $PSScriptRoot '..\..\AstraDesk-Dev' }))
$ErrorActionPreference = 'Stop'
$sourceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$fixtureRoot = Join-Path ([IO.Path]::GetFullPath($WorkspaceRoot)) ('.validation\data-migration-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $fixtureRoot -Force | Out-Null
$electronPath = Join-Path $sourceRoot 'node_modules\electron\dist\electron.exe'
$encryptScript = @'
const {app,safeStorage}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const source=process.argv[2];
const compatibility=require(path.join(source,'shared','compatibility.json'));
const legacy=path.join(__dirname,'appdata',compatibility.legacyDataDirectory);
app.setName('Legacy profile verification');
app.setPath('userData',legacy);
app.whenReady().then(()=>{
  try {
    const defaults=require(path.join(source,'shared','default-settings.json'));
    const settings={...defaults,theme:'rider',language:'en',modules:{...defaults.modules,codex:false}};
    fs.writeFileSync(path.join(legacy,'settings.json'),JSON.stringify(settings,null,2));
    if(!safeStorage.isEncryptionAvailable())throw new Error('Encryption unavailable');
    fs.writeFileSync(path.join(legacy,'digitalocean.enc'),safeStorage.encryptString('astradesk-migration-fixture-only'));
    // Normal quit flushes Chromium Local State; immediate app.exit discards the wrapped key.
    setTimeout(()=>app.quit(),1000);
  }catch(error){console.error(error.message);app.exit(1);}
});
'@
$migrateScript = @'
const fs=require('node:fs'),path=require('node:path');
const source=process.argv[2];
const {prepareDataDirectory}=require(path.join(source,'electron','data-directory.cjs'));
const {legacyDataDirectory}=require(path.join(source,'shared','compatibility.json'));
const root=path.join(__dirname,'appdata');
const result=prepareDataDirectory(root);
if(!result.migrated)throw new Error('Migration did not run');
for(const file of ['settings.json','digitalocean.enc','Local State']){
  if(!fs.readFileSync(path.join(root,legacyDataDirectory,file)).equals(fs.readFileSync(path.join(result.directory,file))))throw new Error('Migration bytes changed');
}
'@
$decryptScript = @'
const {app,safeStorage}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const brand=require(path.join(process.argv[2],'shared','brand.json'));
const current=path.join(__dirname,'appdata',brand.dataDirectory);
app.setName(brand.name);
app.setAppUserModelId(brand.appId);
app.setPath('userData',current);
app.whenReady().then(()=>{
  try {
    const decrypted=safeStorage.decryptString(fs.readFileSync(path.join(current,'digitalocean.enc')));
    if(decrypted!=='astradesk-migration-fixture-only')throw new Error('Credential decryption failed');
    fs.writeFileSync(path.join(__dirname,'result.json'),JSON.stringify({crossProcessDecryption:true,settingsPreserved:true,encryptedBytesPreserved:true}));
    app.quit();
  }catch(error){console.error(error.message);app.exit(1);}
});
'@
foreach ($entry in @{ 'encrypt.cjs' = $encryptScript; 'migrate.cjs' = $migrateScript; 'decrypt.cjs' = $decryptScript }.GetEnumerator()) {
    [IO.File]::WriteAllText((Join-Path $fixtureRoot $entry.Key), $entry.Value)
}
foreach ($step in @('encrypt', 'migrate', 'decrypt')) {
    $script = Join-Path $fixtureRoot "$step.cjs"
    if ($step -eq 'migrate') {
        & node.exe $script $sourceRoot
        if ($LASTEXITCODE -ne 0) { throw 'Migration verification failed' }
    } else {
        $arguments = '"' + $script + '" "' + $sourceRoot + '"'
        $process = Start-Process -FilePath $electronPath -ArgumentList $arguments -WindowStyle Hidden -RedirectStandardError (Join-Path $fixtureRoot "$step-error.log") -PassThru -Wait
        if ($process.ExitCode -ne 0) { throw "Cross-process $step verification failed; inspect $fixtureRoot" }
    }
}
Get-Content -LiteralPath (Join-Path $fixtureRoot 'result.json')
Write-Output "Isolated fixture: $fixtureRoot. Run npm run clean after packaged verification."
