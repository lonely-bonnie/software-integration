// Developer health check of the application's own renderer and bridge.
// Uses a separate data directory. It never opens websites or saves credentials.
const fs = require('node:fs');
const path = require('node:path');
const { safeStorage } = require('electron');
async function smokeCheck(window, refreshMetrics) {
  const output = process.env.ASTRADESK_SMOKE_DIR;
  if (!output || !process.env.ASTRADESK_DATA_DIR)
    throw new Error('Smoke check requires isolated output and user data directories');
  fs.mkdirSync(output, { recursive: true });
  const credentialProtection =
    safeStorage.isEncryptionAvailable() &&
    safeStorage.decryptString(safeStorage.encryptString('astradesk-health-probe')) ===
      'astradesk-health-probe';
  await new Promise((resolve) => setTimeout(resolve, 500));
  const renderer = await window.webContents
    .executeJavaScript(`(async () => { const settings = await window.astraDesk.getSettings(); return ({
    title: document.title,
    heading: document.querySelector('h1')?.textContent,
    bridgeAvailable: typeof window.astraDesk?.getSettings === 'function',
    ipcSettingsReadable: typeof settings.digitalOcean.tokenConfigured === 'boolean',
    tokenConfigured: settings.digitalOcean.tokenConfigured,
    theme: settings.theme,
    language: settings.language,
    schemaVersion: settings.schemaVersion,
    nodeAvailable: typeof window.require !== 'undefined',
    artworkLoaded: [...document.images].every(image => image.complete && image.naturalWidth > 0)
  }); })()`);
  const themeAssets = require('../shared/themes.json').map((theme) => theme.artwork);
  const themeArtworkLoaded = await window.webContents
    .executeJavaScript(`Promise.all(${JSON.stringify(themeAssets)}.map(src => new Promise(resolve => {
    const image = new Image(); image.onload = () => resolve(image.naturalWidth > 0); image.onerror = () => resolve(false); image.src = src;
  }))).then(results => results.length === 4 && results.every(Boolean))`);
  const snapshot = await refreshMetrics();
  if (
    !/控制中心|Overview/.test(renderer.heading || '') ||
    !renderer.bridgeAvailable ||
    !renderer.ipcSettingsReadable ||
    renderer.nodeAvailable ||
    !renderer.artworkLoaded ||
    !themeArtworkLoaded ||
    !snapshot
  )
    throw new Error('Renderer or bridge health check failed');
  const bilingual = await window.webContents.executeJavaScript(`(async () => {
    const initial = await window.astraDesk.getSettings();
    const nav = () => [...document.querySelectorAll('nav button')];
    nav()[2].click();
    await new Promise(resolve => setTimeout(resolve, 100));
    const language = document.querySelector('select[aria-label="界面语言"],select[aria-label="Interface language"]');
    if (!language) throw new Error('Language setting missing');
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    setter.call(language, 'en'); language.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 100));
    const settingsEnglish = document.querySelector('h1').textContent.includes('Settings');
    const untranslated = (document.querySelector('main').innerText.match(/[\\u4e00-\\u9fff]+/g) || []).filter(text => text !== '简体中文');
    language.value = initial.language; language.dispatchEvent(new Event('change', { bubbles: true }));
    nav()[0].click();
    await new Promise(resolve => setTimeout(resolve, 100));
    return { settingsEnglish, untranslated, initialTheme: initial.theme };
  })()`);
  if (!bilingual.settingsEnglish || bilingual.untranslated.length)
    throw new Error('Bilingual settings check failed: ' + JSON.stringify(bilingual));
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
        themeArtworkLoaded,
        bilingual,
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
