const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_SETTINGS,
  validateSettings,
  exportProfile,
  importProfile,
} = require('../electron/settings.cjs');

test('旧配置迁移保留主题与连接，新安装默认流萤并关闭自动启动', () => {
  const migrated = validateSettings({
    theme: 'rider',
    codexPath: 'D:\\tools\\codex.exe',
    digitalOcean: { dropletId: '123' },
    websites: [],
  });
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.language, 'zh-CN');
  assert.equal(migrated.theme, 'rider');
  assert.equal(migrated.digitalOcean.dropletId, '123');
  assert.equal(migrated.launchAtLogin, false);
  assert.equal(DEFAULT_SETTINGS.theme, 'anime');
  assert.equal(validateSettings({ language: 'xx', timeZone: 'bad' }).timeZone, 'local');
  assert.throws(() => validateSettings({ schemaVersion: 99 }), /较新版本/);
});
test('配置可跨机器分享，不导出凭据或设备路径，导入不覆盖当前账户连接', () => {
  const source = {
    ...DEFAULT_SETTINGS,
    language: 'en',
    launchAtLogin: true,
    codexPath: 'D:\\tools\\codex.exe',
    digitalOcean: { dropletId: '123', tokenConfigured: true },
    token: 'secret',
    unexpected: 'secret',
  };
  const profile = exportProfile(source);
  const json = JSON.stringify(profile);
  for (const value of ['secret', 'digitalOcean', 'codexPath', 'tokenConfigured', '123'])
    assert.ok(!json.includes(value));
  const restored = importProfile(profile, {
    ...DEFAULT_SETTINGS,
    digitalOcean: { dropletId: '456' },
    codexPath: 'C:\\tools\\codex.exe',
  });
  assert.equal(restored.language, 'en');
  assert.equal(restored.digitalOcean.dropletId, '456');
  assert.equal(restored.codexPath, 'C:\\tools\\codex.exe');
  assert.throws(
    () => importProfile({ format: 'anything', version: 1 }, DEFAULT_SETTINGS),
    /不是有效/,
  );
  assert.throws(
    () => importProfile({ ...profile, preferences: { schemaVersion: 99 } }, DEFAULT_SETTINGS),
    /较新版本/,
  );
});
