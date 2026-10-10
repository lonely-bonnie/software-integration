const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const readline = require('node:readline');
const activeCodexChildren = new Set();

const DEFAULT_SETTINGS = {
  unit: 'Mbps',
  theme: 'rider',
  demoMode: false,
  refreshSeconds: 60,
  modules: { traffic: true, codex: true },
  websites: [
    {
      id: 'digitalocean',
      name: 'DigitalOcean',
      subtitle: '云服务器控制台',
      url: 'https://cloud.digitalocean.com/',
    },
    {
      id: 'tailscale',
      name: 'Tailscale',
      subtitle: '私网与设备管理',
      url: 'https://console.tailscale.com/admin/',
    },
  ],
  digitalOcean: { dropletId: '', tokenConfigured: false },
  codexPath: '',
  closeToTray: true,
};

function validateSettings(input) {
  if (!input || typeof input !== 'object') throw new Error('设置格式无效');
  const websites = Array.isArray(input.websites)
    ? input.websites.slice(0, 30).map((site, index) => {
        if (!site || typeof site.name !== 'string' || !site.name.trim())
          throw new Error('网站名称不能为空');
        const url = new URL(site.url);
        if (url.protocol !== 'https:' || url.username || url.password)
          throw new Error('网站须使用 HTTPS 且不能包含登录凭据');
        return {
          id: `site-${index}`,
          name: site.name.trim().slice(0, 60),
          subtitle: String(site.subtitle || '网站入口').slice(0, 100),
          url: url.href,
        };
      })
    : DEFAULT_SETTINGS.websites;
  const dropletId = String(input.digitalOcean?.dropletId || '').trim();
  if (dropletId && !/^\d{1,20}$/.test(dropletId)) throw new Error('Droplet ID 应为数字');
  const codexPath = typeof input.codexPath === 'string' ? input.codexPath.trim() : '';
  if (
    codexPath &&
    (!path.isAbsolute(codexPath) || !/^codex(?:\.exe)?$/i.test(path.basename(codexPath)))
  )
    throw new Error('请选择 codex.exe 的完整路径');
  return {
    unit: input.unit === 'MB/s' ? 'MB/s' : 'Mbps',
    theme: input.theme === 'arctic' ? 'arctic' : 'rider',
    demoMode: input.demoMode === true,
    refreshSeconds: Math.min(300, Math.max(30, Number(input.refreshSeconds) || 60)),
    modules: { traffic: input.modules?.traffic !== false, codex: input.modules?.codex !== false },
    websites,
    digitalOcean: { dropletId, tokenConfigured: false },
    codexPath,
    closeToTray: input.closeToTray !== false,
  };
}

function normalizeRateLimits(response, sampledAt = Date.now()) {
  const source =
    response.rateLimitsByLimitId && Object.keys(response.rateLimitsByLimitId).length
      ? response.rateLimitsByLimitId
      : { [response.rateLimits?.limitId || 'codex']: response.rateLimits };
  const buckets = [];
  for (const [id, limit] of Object.entries(source)) {
    if (!limit) continue;
    for (const windowKey of ['primary', 'secondary']) {
      const window = limit[windowKey];
      if (!window || typeof window.usedPercent !== 'number' || !Number.isFinite(window.usedPercent))
        continue;
      buckets.push({
        id: `${id}:${windowKey}`,
        name: limit.limitName || id,
        window: windowKey,
        usedPercent: Math.min(100, Math.max(0, window.usedPercent)),
        remainingPercent: Math.min(100, Math.max(0, 100 - window.usedPercent)),
        windowDurationMins:
          typeof window.windowDurationMins === 'number' &&
          Number.isFinite(window.windowDurationMins) &&
          window.windowDurationMins > 0
            ? window.windowDurationMins
            : null,
        resetsAt:
          typeof window.resetsAt === 'number' && Number.isFinite(window.resetsAt)
            ? window.resetsAt * 1000
            : null,
        sampledAt,
      });
    }
  }
  return buckets;
}

function extractPoints(body) {
  const merged = new Map();
  for (const result of Array.isArray(body?.data?.result) ? body.data.result : []) {
    if (!result || typeof result !== 'object') continue;
    const entries = Array.isArray(result.values)
      ? result.values
      : Array.isArray(result.value)
        ? [result.value]
        : [];
    for (const entry of entries) {
      if (!Array.isArray(entry) || entry.length < 2) continue;
      const [timestamp, value] = entry;
      const rate = Number(value),
        time = Number(timestamp) * 1000;
      if (
        value === null ||
        (typeof value === 'string' && !value.trim()) ||
        !['number', 'string'].includes(typeof value) ||
        !Number.isFinite(rate) ||
        rate < 0 ||
        !Number.isFinite(time) ||
        time <= 0
      )
        continue;
      merged.set(time, (merged.get(time) || 0) + rate);
    }
  }
  return [...merged].sort((a, b) => a[0] - b[0]).map(([timestamp, mbps]) => ({ timestamp, mbps }));
}

async function digitalOceanTraffic(settings, token, fetcher = fetch) {
  if (!token || !settings.digitalOcean.dropletId)
    return {
      status: 'unconfigured',
      message: '在设置中添加只读 Token 与 Droplet ID',
      inbound: null,
      outbound: null,
      source: 'DigitalOcean Monitoring API',
      sampledAt: null,
    };
  const now = Math.floor(Date.now() / 1000);
  const getDirection = async (direction) => {
    const params = new URLSearchParams({
      host_id: settings.digitalOcean.dropletId,
      interface: 'public',
      direction,
      start: String(now - 1800),
      end: String(now),
    });
    const response = await fetcher(
      `https://api.digitalocean.com/v2/monitoring/metrics/droplet/bandwidth?${params}`,
      {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok) {
      const error = new Error(
        response.status === 401
          ? 'Token 无效或已过期'
          : response.status === 403
            ? 'Token 缺少 monitoring:read 权限'
            : response.status === 429
              ? '接口限流，稍后自动重试'
              : `服务返回 HTTP ${response.status}`,
      );
      if (response.status === 429) {
        const retry = response.headers.get('retry-after');
        error.retryAfter = Math.min(3600, Math.max(60, Number(retry) || 300));
      }
      throw error;
    }
    return extractPoints(await response.json());
  };
  const [inbound, outbound] = await Promise.all([
    getDirection('inbound'),
    getDirection('outbound'),
  ]);
  const latestIn = inbound.at(-1),
    latestOut = outbound.at(-1);
  if (!latestIn || !latestOut)
    return {
      status: 'unavailable',
      message: '当前时间范围内没有完整的入站与出站样本，请检查监控服务',
      inbound: latestIn?.mbps ?? null,
      outbound: latestOut?.mbps ?? null,
      source: 'DigitalOcean Monitoring API',
      sampledAt: null,
      series: { inbound, outbound },
    };
  const sampledAt = Math.min(latestIn.timestamp, latestOut.timestamp);
  return {
    status: Date.now() - sampledAt > 180000 ? 'stale' : 'ready',
    message: '',
    inbound: latestIn.mbps,
    outbound: latestOut.mbps,
    sampledAt,
    source: 'DigitalOcean Monitoring API · 公网',
    series: { inbound, outbound },
    cumulative: null,
  };
}

function discoverCodex(customPath = '') {
  if (customPath) return fs.existsSync(customPath) ? customPath : null;
  const root = path.join(
    process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'),
    'OpenAI',
    'Codex',
    'bin',
  );
  let candidates = [];
  try {
    candidates = fs
      .readdirSync(root)
      .map((dir) => path.join(root, dir, 'codex.exe'))
      .filter((file) => fs.existsSync(file))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  } catch {}
  if (candidates[0]) return candidates[0];
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    const file = path.join(dir, process.platform === 'win32' ? 'codex.exe' : 'codex');
    if (fs.existsSync(file)) return file;
  }
  return null;
}

async function codexQuota(customPath = '', dependencies = {}) {
  const executable = (dependencies.discover || discoverCodex)(customPath);
  if (!executable)
    return {
      status: 'unconfigured',
      message: '未找到 Codex CLI，可在设置中指定 codex.exe',
      buckets: [],
      sampledAt: null,
      source: 'Codex App Server',
    };
  return new Promise((resolve) => {
    let finished = false,
      nextId = 1;
    const pending = new Map();
    const child = (dependencies.spawn || spawn)(executable, ['app-server', '--stdio'], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    activeCodexChildren.add(child);
    child.once('close', () => activeCodexChildren.delete(child));
    const reader = readline.createInterface({ input: child.stdout });
    const finish = (result) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      reader.close();
      for (const entry of pending.values()) entry.reject(new Error('连接已关闭'));
      pending.clear();
      child.stdin.end();
      child.once('close', () => {
        clearTimeout(cleanupTimer);
        resolve(result);
      });
      const cleanupTimer = setTimeout(() => resolve(result), 1000);
      child.kill();
    };
    const timer = setTimeout(
      () =>
        finish({
          status: 'error',
          message: '读取 Codex 额度超时，请检查 CLI 登录与网络连接',
          buckets: [],
          source: 'Codex App Server',
          sampledAt: null,
        }),
      25000,
    );
    const request = (method, params) =>
      new Promise((resolveRequest, reject) => {
        const id = nextId++;
        pending.set(id, { resolve: resolveRequest, reject });
        child.stdin.write(JSON.stringify({ id, method, ...(params ? { params } : {}) }) + '\n');
      });
    child.stderr.on('data', () => {});
    child.stdin.on('error', () => {});
    child.on('error', () =>
      finish({
        status: 'error',
        message: '无法启动 Codex CLI，请检查可执行文件',
        buckets: [],
        source: 'Codex App Server',
        sampledAt: null,
      }),
    );
    child.on('exit', () => {
      if (!finished)
        finish({
          status: 'error',
          message: 'Codex 数据连接已退出',
          buckets: [],
          source: 'Codex App Server',
          sampledAt: null,
        });
    });
    reader.on('line', (line) => {
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        return;
      }
      const handler = pending.get(message.id);
      if (!handler) return;
      pending.delete(message.id);
      if (message.error) handler.reject(new Error(String(message.error.message || '额度读取失败')));
      else handler.resolve(message.result);
    });
    (async () => {
      try {
        await request('initialize', {
          clientInfo: {
            name: 'rider_console',
            title: 'Rider Console',
            version: require('../package.json').version,
          },
        });
        child.stdin.write(JSON.stringify({ method: 'initialized' }) + '\n');
        const account = await request('account/read', { refreshToken: false });
        const limits = await request('account/rateLimits/read');
        const sampledAt = Date.now(),
          buckets = normalizeRateLimits(limits, sampledAt);
        finish({
          status: buckets.length ? 'ready' : 'unavailable',
          message: buckets.length ? '' : '服务未返回额度窗口',
          buckets,
          sampledAt,
          source: 'Codex App Server',
          account: { type: account.account?.type || null, plan: account.account?.planType || null },
        });
      } catch (error) {
        const message = /auth|login|sign|token|authentication/i.test(error.message)
          ? '请先在 Codex CLI 中登录目标账户；当前身份无法读取额度'
          : 'Codex 未能返回额度，请检查版本兼容性与网络连接';
        finish({
          status: 'error',
          message,
          buckets: [],
          source: 'Codex App Server',
          sampledAt: null,
        });
      }
    })();
  });
}

function stopCodexClients() {
  for (const child of activeCodexChildren) child.kill();
}

function forecastQuota(samples, bucket, now = Date.now()) {
  if (!bucket.resetsAt || bucket.resetsAt <= now) return null;
  const matching = samples
    .filter(
      (sample) =>
        sample.id === bucket.id &&
        sample.resetsAt === bucket.resetsAt &&
        sample.sampledAt >= now - 3600000,
    )
    .sort((a, b) => a.sampledAt - b.sampledAt);
  if (matching.length < 3) return null;
  for (let i = 1; i < matching.length; i++)
    if (
      matching[i].usedPercent < matching[i - 1].usedPercent ||
      matching[i].sampledAt - matching[i - 1].sampledAt > 600000
    )
      return null;
  const first = matching[0],
    last = matching.at(-1),
    elapsed = last.sampledAt - first.sampledAt,
    consumed = last.usedPercent - first.usedPercent;
  if (elapsed < 300000 || consumed < 2) return null;
  const predicted = now + (bucket.remainingPercent / consumed) * elapsed;
  return predicted < bucket.resetsAt ? predicted : null;
}

function demoSnapshot() {
  const now = Date.now();
  const series = { inbound: [], outbound: [] };
  for (let i = 0; i < 31; i++) {
    const timestamp = now - (30 - i) * 60000;
    series.inbound.push({ timestamp, mbps: 12 + Math.sin(i * 0.5) * 5 + i * 0.18 });
    series.outbound.push({ timestamp, mbps: 30 + Math.sin(i * 0.4) * 12 + i * 0.65 });
  }
  return {
    mode: 'demo',
    updatedAt: now,
    traffic: {
      status: 'demo',
      inbound: 18.4,
      outbound: 52.8,
      series,
      cumulative: null,
      sampledAt: now,
      source: '本地演示数据',
      message: '',
    },
    codex: {
      status: 'demo',
      source: '本地演示数据',
      sampledAt: now,
      message: '',
      buckets: [
        {
          id: 'demo:primary',
          name: '演示额度',
          window: 'primary',
          usedPercent: 57,
          remainingPercent: 43,
          windowDurationMins: 300,
          resetsAt: now + 8280000,
          sampledAt: now,
        },
        {
          id: 'demo:secondary',
          name: '演示额度',
          window: 'secondary',
          usedPercent: 21,
          remainingPercent: 79,
          windowDurationMins: 10080,
          resetsAt: now + 280800000,
          sampledAt: now,
        },
      ],
    },
  };
}

module.exports = {
  DEFAULT_SETTINGS,
  validateSettings,
  normalizeRateLimits,
  extractPoints,
  digitalOceanTraffic,
  discoverCodex,
  codexQuota,
  stopCodexClients,
  forecastQuota,
  demoSnapshot,
};
