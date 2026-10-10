const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  shell,
  safeStorage,
  dialog,
} = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const brand = require('../shared/brand.json');
const { exportProfile, importProfile } = require('./settings.cjs');
const packageInfo = require('../package.json');
const {
  DEFAULT_SETTINGS,
  validateSettings,
  digitalOceanTraffic,
  codexQuota,
  stopCodexClients,
  forecastQuota,
  demoSnapshot,
} = require('./providers.cjs');

let window,
  tray,
  settings,
  timer,
  quitting = false,
  inFlight = null,
  previous = null,
  token = '',
  quotaSamples = [],
  codexCached = null,
  retryUntil = 0,
  revision = 0;
let configurationWarning = '';
const userData = () => app.getPath('userData');
const settingsPath = () => path.join(userData(), 'settings.json');
const tokenPath = () => path.join(userData(), 'digitalocean.enc');
const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
const devUrl =
  process.env.RIDER_DEV_URL === 'http://127.0.0.1:5173' ? process.env.RIDER_DEV_URL : '';

function writeAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file + '.tmp', data);
  fs.renameSync(file + '.tmp', file);
}
function loadSettings() {
  try {
    return validateSettings({
      ...DEFAULT_SETTINGS,
      ...JSON.parse(fs.readFileSync(settingsPath(), 'utf8')),
    });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      configurationWarning = '配置读取失败，已使用默认偏好；原文件已保留，请检查数据目录';
      try {
        fs.copyFileSync(
          settingsPath(),
          path.join(userData(), `settings-recovery-${Date.now()}.json`),
        );
      } catch {
        /* Keep original untouched even if recovery copy fails. */
      }
    }
    return structuredClone(DEFAULT_SETTINGS);
  }
}
function publicSettings() {
  return {
    ...settings,
    digitalOcean: { ...settings.digitalOcean, tokenConfigured: Boolean(token) },
  };
}
function verifySender(event) {
  if (
    !window ||
    event.sender !== window.webContents ||
    event.senderFrame !== window.webContents.mainFrame
  )
    throw new Error('无效的界面请求');
  const url = event.senderFrame.url;
  if (devUrl ? new URL(url).origin !== devUrl : url.split('#')[0] !== pathToFileURL(indexPath).href)
    throw new Error('无效的来源');
}
function stale(previousValue, fallback) {
  return previousValue?.sampledAt
    ? { ...previousValue, status: 'stale', message: fallback.message }
    : fallback;
}
function showWindow() {
  if (!window) return;
  window.show();
  window.focus();
}

async function refreshMetrics() {
  if (inFlight) return inFlight;
  const requestRevision = revision,
    requestSettings = structuredClone(settings),
    requestToken = token,
    requestPrevious = previous;
  inFlight = (async () => {
    if (requestSettings.demoMode) {
      previous = demoSnapshot();
      if (window && !window.isDestroyed()) window.webContents.send('metrics:snapshot', previous);
      return previous;
    }
    const [traffic, codex] = await Promise.all([
      requestSettings.modules.traffic
        ? Date.now() < retryUntil
          ? Promise.resolve(
              stale(requestPrevious?.traffic, {
                status: 'error',
                message: '接口限流，等待重试',
                sampledAt: null,
                source: 'DigitalOcean Monitoring API',
              }),
            )
          : digitalOceanTraffic(requestSettings, requestToken).catch((error) => {
              if (error.retryAfter && requestRevision === revision)
                retryUntil = Date.now() + error.retryAfter * 1000;
              return stale(requestPrevious?.mode === 'live' ? requestPrevious.traffic : null, {
                status: 'error',
                message: error.message,
                inbound: null,
                outbound: null,
                sampledAt: null,
                source: 'DigitalOcean Monitoring API',
              });
            })
        : Promise.resolve({
            status: 'disabled',
            message: '模块已停用',
            inbound: null,
            outbound: null,
            sampledAt: null,
            source: 'DigitalOcean Monitoring API',
          }),
      requestSettings.modules.codex
        ? codexCached &&
          Date.now() - codexCached.sampledAt < 120000 &&
          !codexCached.buckets.some((bucket) => bucket.resetsAt && bucket.resetsAt <= Date.now())
          ? Promise.resolve(structuredClone(codexCached))
          : codexQuota(requestSettings.codexPath)
        : Promise.resolve({
            status: 'disabled',
            message: '模块已停用',
            buckets: [],
            sampledAt: null,
            source: 'Codex App Server',
          }),
    ]);
    if (requestRevision !== revision || quitting) return null;
    if (codex.status === 'ready') {
      codexCached = codex;
      quotaSamples = quotaSamples.filter((sample) => Date.now() - sample.sampledAt < 3600000);
      for (const bucket of codex.buckets) {
        if (
          !quotaSamples.some(
            (sample) => sample.id === bucket.id && sample.sampledAt === bucket.sampledAt,
          )
        )
          quotaSamples.push(bucket);
        bucket.forecastAt = forecastQuota(quotaSamples, bucket);
      }
    }
    const realCodex =
      codex.status === 'error'
        ? stale(previous?.mode === 'live' ? previous.codex : null, codex)
        : codex;
    previous = { mode: 'live', updatedAt: Date.now(), traffic, codex: realCodex };
    if (window && !window.isDestroyed()) window.webContents.send('metrics:snapshot', previous);
    return previous;
  })();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
    if (requestRevision !== revision && !quitting) void refreshMetrics();
  }
}
function schedule() {
  clearInterval(timer);
  timer = setInterval(() => void refreshMetrics(), settings.refreshSeconds * 1000);
}

function applyLoginSettings(next) {
  if (!app.isPackaged || process.env.PORTABLE_EXECUTABLE_FILE || process.env.RIDER_SMOKE_DIR)
    return;
  app.setLoginItemSettings({
    name: brand.name,
    openAtLogin: next.launchAtLogin,
    path: process.execPath,
    args: next.startMinimized ? ['--hidden'] : [],
  });
}
function updateTray() {
  if (!tray) return;
  const en = settings.language === 'en';
  tray.setToolTip(brand.name);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: en ? 'Open workspace' : '打开工作台', click: showWindow },
      { label: en ? 'Refresh data' : '刷新数据', click: () => void refreshMetrics() },
      { type: 'separator' },
      {
        label: en ? 'Quit' : '退出',
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ]),
  );
}

function createWindow() {
  window = new BrowserWindow({
    width: 1440,
    height: 970,
    minWidth: 940,
    minHeight: 680,
    title: brand.name,
    icon: path.join(__dirname, 'app-icon.png'),
    backgroundColor: '#fff8ee',
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    show: false,
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (devUrl ? new URL(url).origin !== devUrl : url !== pathToFileURL(indexPath).href)
      event.preventDefault();
  });
  window.on('ready-to-show', () => {
    if (
      process.env.RIDER_SMOKE_DIR ||
      (!settings.startMinimized && !process.argv.includes('--hidden'))
    )
      window.show();
    void refreshMetrics();
    if (process.env.RIDER_SMOKE_DIR) {
      require('./smoke.cjs')
        .smokeCheck(window, refreshMetrics)
        .then(() => {
          quitting = true;
          app.quit();
        })
        .catch((error) => {
          fs.mkdirSync(process.env.RIDER_SMOKE_DIR, { recursive: true });
          fs.writeFileSync(path.join(process.env.RIDER_SMOKE_DIR, 'failure.txt'), error.message);
          quitting = true;
          app.exit(1);
        });
    }
  });
  window.on('close', (event) => {
    if (!quitting && settings.closeToTray) {
      event.preventDefault();
      window.hide();
    }
  });
  if (devUrl) window.loadURL(devUrl);
  else window.loadFile(indexPath);
  // The small notification-area icon is derived from the local hero artwork.
  const iconSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="8" fill="#171c22"/><path d="M5 12l9-4v11L5 17zm22 0-9-4v11l9-2z" fill="#a9df70"/><path d="M15 5h2v22h-2z" fill="#ef5149"/></svg>';
  const sharpIcon = path.join(__dirname, 'tray.png');
  let icon = fs.existsSync(sharpIcon)
    ? nativeImage.createFromPath(sharpIcon)
    : nativeImage.createFromDataURL(
        'data:image/svg+xml;base64,' + Buffer.from(iconSvg).toString('base64'),
      );
  tray = new Tray(icon);
  updateTray();
  tray.on('double-click', showWindow);
  schedule();
}

function registerIpc() {
  const handle = (channel, handler) =>
    ipcMain.handle(channel, (event, ...args) => {
      verifySender(event);
      return handler(...args);
    });
  handle('settings:get', () => publicSettings());
  handle('app:info', () => ({
    name: brand.name,
    version: packageInfo.version,
    packaged: app.isPackaged,
    startupAvailable: app.isPackaged && !process.env.PORTABLE_EXECUTABLE_FILE,
    platform: process.platform,
    dataDirectory: userData(),
    releases: brand.releases,
    issues: brand.issues,
    configurationWarning,
  }));
  handle('app:support', async (target) => {
    if (target === 'data') {
      const failure = await shell.openPath(userData());
      if (failure) throw new Error('无法打开数据目录');
    } else if (target === 'releases' || target === 'issues')
      await shell.openExternal(brand[target]);
    else throw new Error('无效的界面请求');
  });
  handle('settings:export', async () => {
    const result = await dialog.showSaveDialog(window, {
      defaultPath: 'AstraDesk-profile.json',
      filters: [{ name: 'AstraDesk profile', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return false;
    writeAtomic(result.filePath, JSON.stringify(exportProfile(settings), null, 2));
    return true;
  });
  handle('settings:import', async () => {
    const result = await dialog.showOpenDialog(window, {
      properties: ['openFile'],
      filters: [{ name: 'AstraDesk profile', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const file = result.filePaths[0];
    if (fs.statSync(file).size > 256 * 1024) throw new Error('配置文件过大');
    return {
      ...importProfile(JSON.parse(fs.readFileSync(file, 'utf8')), settings),
      digitalOcean: publicSettings().digitalOcean,
    };
  });
  handle('settings:save', async (input, newToken) => {
    const next = validateSettings(input);
    let encrypted;
    if (newToken !== undefined && newToken !== '') {
      if (typeof newToken !== 'string' || newToken.length > 1024 || !/^\S+$/.test(newToken))
        throw new Error('Token 格式无效');
      if (!safeStorage.isEncryptionAvailable()) throw new Error('当前系统无法加密凭据，尚未保存');
      encrypted = safeStorage.encryptString(newToken.trim());
    }
    if (
      next.launchAtLogin !== settings.launchAtLogin ||
      next.startMinimized !== settings.startMinimized
    )
      applyLoginSettings(next);
    writeAtomic(settingsPath(), JSON.stringify(next, null, 2));
    if (encrypted) {
      writeAtomic(tokenPath(), encrypted);
      token = newToken.trim();
    }
    settings = next;
    updateTray();
    revision++;
    codexCached = null;
    quotaSamples = [];
    previous = null;
    retryUntil = 0;
    schedule();
    void refreshMetrics();
    return publicSettings();
  });
  handle('token:remove', () => {
    if (fs.existsSync(tokenPath())) fs.unlinkSync(tokenPath());
    token = '';
    revision++;
    previous = null;
    retryUntil = 0;
    void refreshMetrics();
    return publicSettings();
  });
  handle('metrics:refresh', () => refreshMetrics());
  handle('website:open', async (raw) => {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password)
      throw new Error('仅支持无凭据的 HTTPS 网站');
    if (
      !settings.websites.some((site) => site.url === url.href) &&
      url.href !== 'https://cloud.digitalocean.com/account/billing'
    )
      throw new Error('网站尚未加入入口配置');
    await shell.openExternal(url.href);
  });
  handle('window:action', (action) => {
    if (action === 'minimize') window.minimize();
    else if (action === 'maximize') window.isMaximized() ? window.unmaximize() : window.maximize();
    else if (action === 'close') window.close();
    else if (action === 'quit') {
      quitting = true;
      app.quit();
    }
  });
}

// Stable location keeps pre-rename settings and DPAPI credentials compatible.
app.setName(brand.name);
app.setAppUserModelId(brand.appId);
app.setPath(
  'userData',
  process.env.RIDER_DATA_DIR
    ? path.resolve(process.env.RIDER_DATA_DIR)
    : path.join(app.getPath('appData'), brand.dataDirectory),
);
const lock = app.requestSingleInstanceLock();
if (!lock) app.quit();
else {
  app.on('second-instance', showWindow);
  app.whenReady().then(() => {
    settings = loadSettings();
    if (settings.launchAtLogin) {
      try {
        applyLoginSettings(settings);
      } catch {
        configurationWarning = '无法注册开机启动，可在设置中关闭并重新开启';
      }
    }
    try {
      if (safeStorage.isEncryptionAvailable() && fs.existsSync(tokenPath()))
        token = safeStorage.decryptString(fs.readFileSync(tokenPath()));
    } catch {
      token = '';
    }
    registerIpc();
    createWindow();
  });
  app.on('before-quit', () => {
    quitting = true;
    clearInterval(timer);
    stopCodexClients();
  });
  app.on('window-all-closed', () => {
    if (quitting || !settings?.closeToTray) app.quit();
  });
}
