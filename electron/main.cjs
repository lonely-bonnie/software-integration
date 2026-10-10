const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  shell,
  safeStorage,
} = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
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
  } catch {
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

function createWindow() {
  window = new BrowserWindow({
    width: 1440,
    height: 970,
    minWidth: 940,
    minHeight: 680,
    title: 'Rider Console',
    icon: path.join(__dirname, 'tray.png'),
    backgroundColor: '#0e1115',
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
  // A small original red/green emblem is rendered locally for the notification area.
  const iconSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="8" fill="#171c22"/><path d="M5 12l9-4v11L5 17zm22 0-9-4v11l9-2z" fill="#a9df70"/><path d="M15 5h2v22h-2z" fill="#ef5149"/></svg>';
  const sharpIcon = path.join(__dirname, 'tray.png');
  let icon = fs.existsSync(sharpIcon)
    ? nativeImage.createFromPath(sharpIcon)
    : nativeImage.createFromDataURL(
        'data:image/svg+xml;base64,' + Buffer.from(iconSvg).toString('base64'),
      );
  tray = new Tray(icon);
  tray.setToolTip('Rider Console · 软件集成中心');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '打开工作台', click: showWindow },
      { label: '刷新数据', click: () => void refreshMetrics() },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ]),
  );
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
  handle('settings:save', async (input, newToken) => {
    const next = validateSettings(input);
    if (newToken !== undefined && newToken !== '') {
      if (typeof newToken !== 'string' || newToken.length > 1024 || !/^\S+$/.test(newToken))
        throw new Error('Token 格式无效');
      if (!safeStorage.isEncryptionAvailable()) throw new Error('当前系统无法加密凭据，尚未保存');
      const encrypted = safeStorage.encryptString(newToken.trim());
      writeAtomic(tokenPath(), encrypted);
      token = newToken.trim();
    }
    settings = next;
    revision++;
    codexCached = null;
    quotaSamples = [];
    previous = null;
    retryUntil = 0;
    writeAtomic(settingsPath(), JSON.stringify(settings, null, 2));
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

if (process.env.RIDER_DATA_DIR) app.setPath('userData', path.resolve(process.env.RIDER_DATA_DIR));
const lock = app.requestSingleInstanceLock();
if (!lock) app.quit();
else {
  app.on('second-instance', showWindow);
  app.whenReady().then(() => {
    settings = loadSettings();
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
