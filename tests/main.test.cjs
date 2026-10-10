const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const providers = require('../electron/providers.cjs');

function harness(overrides = {}) {
  const handlers = {},
    sent = [],
    files = new Map();
  const frame = { url: pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).href };
  const contents = { mainFrame: frame, send: (_channel, payload) => sent.push(payload) };
  const electron = {
    app: {
      getPath: () => '/isolated-test',
      requestSingleInstanceLock: () => false,
      quit: () => {},
    },
    ipcMain: {
      handle: (name, fn) => {
        handlers[name] = fn;
      },
    },
    safeStorage: {
      isEncryptionAvailable: () => true,
      encryptString: (value) => Buffer.from(value),
    },
    shell: { openExternal: async () => {} },
  };
  const sandbox = {
    require: (name) =>
      name === 'electron'
        ? electron
        : name === './providers.cjs'
          ? { ...providers, ...overrides }
          : name === 'node:fs'
            ? {
                mkdirSync: () => {},
                writeFileSync: (file, data) => files.set(file, data),
                renameSync: (from, to) => {
                  files.set(to, files.get(from));
                  files.delete(from);
                },
                existsSync: (file) => files.has(file),
                unlinkSync: (file) => files.delete(file),
              }
            : require(name),
    __dirname: path.join(__dirname, '..', 'electron'),
    process: { env: {} },
    structuredClone,
    URL,
    Buffer,
    Date,
    setInterval: () => 1,
    clearInterval: () => {},
  };
  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'electron', 'main.cjs'), 'utf8') +
      `
    settings=structuredClone(DEFAULT_SETTINGS);
    window={webContents:fakeContents,isDestroyed:()=>false};
    registerIpc(); globalThis.testApi={refreshMetrics};
  `.replace('fakeContents', 'globalThis.contents'),
    Object.assign(sandbox, { contents }),
  );
  const event = { sender: contents, senderFrame: frame };
  return {
    refresh: () => sandbox.testApi.refreshMetrics(),
    invoke: (name, ...args) => handlers[name](event, ...args),
    handlers,
    event,
    sent,
    files,
  };
}

test('修改配置时丢弃进行中的旧请求，再发布新配置数据', async () => {
  let releaseOld,
    calls = 0;
  const h = harness({
    codexQuota: () => {
      calls++;
      return new Promise((resolve) => {
        releaseOld = resolve;
      });
    },
  });
  const pending = h.refresh();
  await h.invoke('settings:save', { ...providers.DEFAULT_SETTINGS, demoMode: true });
  releaseOld({ status: 'ready', buckets: [], sampledAt: Date.now(), source: 'old request' });
  assert.equal(await pending, null);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1);
  assert.equal(h.sent.length, 1);
  assert.equal(h.sent[0].mode, 'demo');
  assert.ok(!h.sent.some((snapshot) => snapshot.codex.source === 'old request'));
});

test('IPC 拒绝其他 frame、近似文件 URL 和未配置网站', async () => {
  const h = harness();
  assert.throws(
    () => h.handlers['settings:get']({ ...h.event, senderFrame: { ...h.event.senderFrame } }),
    /无效的界面请求/,
  );
  const original = h.event.senderFrame.url;
  h.event.senderFrame.url += '-attacker';
  assert.throws(() => h.invoke('settings:get'), /无效的来源/);
  h.event.senderFrame.url = original;
  await assert.rejects(h.invoke('website:open', 'https://example.com/'), /尚未加入/);
  await assert.rejects(
    h.invoke('website:open', 'https://user:pass@cloud.digitalocean.com/'),
    /无凭据/,
  );
});

test('Token 不进入公开设置或设置文件，删除后配置状态清除', async () => {
  const h = harness({
    codexQuota: async () => ({ status: 'unavailable', buckets: [], sampledAt: null }),
  });
  await h.invoke('settings:save', providers.DEFAULT_SETTINGS, 'test-only-secret');
  assert.equal(h.invoke('settings:get').digitalOcean.tokenConfigured, true);
  const settings = [...h.files].find(([file]) => file.endsWith('settings.json'))[1];
  assert.ok(!settings.includes('test-only-secret'));
  h.invoke('token:remove');
  assert.equal(h.invoke('settings:get').digitalOcean.tokenConfigured, false);
  await new Promise((resolve) => setImmediate(resolve));
});
