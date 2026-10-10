// Developer health check of the application's own renderer and bridge.
// Uses a separate data directory. It never opens websites or saves credentials.
const fs = require('node:fs');
const path = require('node:path');
const { safeStorage } = require('electron');
async function smokeCheck(window, refreshMetrics) {
  const output = process.env.RIDER_SMOKE_DIR;
  if (!output || !process.env.RIDER_DATA_DIR)
    throw new Error('Smoke check requires isolated output and user data directories');
  fs.mkdirSync(output, { recursive: true });
  const credentialProtection =
    safeStorage.isEncryptionAvailable() &&
    safeStorage.decryptString(safeStorage.encryptString('rider-health-probe')) ===
      'rider-health-probe';
  await new Promise((resolve) => setTimeout(resolve, 500));
  const renderer = await window.webContents
    .executeJavaScript(`(async () => { const settings = await window.rider.getSettings(); return ({
    title: document.title,
    heading: document.querySelector('h1')?.textContent,
    bridgeAvailable: typeof window.rider?.getSettings === 'function',
    ipcSettingsReadable: typeof settings.digitalOcean.tokenConfigured === 'boolean',
    nodeAvailable: typeof window.require !== 'undefined',
    artworkLoaded: [...document.images].every(image => image.complete && image.naturalWidth > 0)
  }); })()`);
  const snapshot = await refreshMetrics();
  if (
    !renderer.heading?.includes('控制中心') ||
    !renderer.bridgeAvailable ||
    !renderer.ipcSettingsReadable ||
    renderer.nodeAvailable ||
    !renderer.artworkLoaded ||
    !snapshot
  )
    throw new Error('Renderer or bridge health check failed');
  await new Promise((resolve) => setTimeout(resolve, 250));
  fs.writeFileSync(
    path.join(output, 'desktop.png'),
    (await window.webContents.capturePage()).toPNG(),
  );
  fs.writeFileSync(
    path.join(output, 'health.json'),
    JSON.stringify(
      {
        renderer,
        credentialProtection,
        mode: snapshot.mode,
        trafficStatus: snapshot.traffic.status,
        codexStatus: snapshot.codex.status,
        quotaWindows: snapshot.codex.buckets.length,
        checkedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}
module.exports = { smokeCheck };
