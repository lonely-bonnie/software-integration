const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { prepareDataDirectory } = require('../electron/data-directory.cjs');
const brand = require('../shared/brand.json');
const compatibility = require('../shared/compatibility.json');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'astradesk-data-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const legacy = path.join(root, compatibility.legacyDataDirectory);
  const current = path.join(root, brand.dataDirectory);
  fs.mkdirSync(legacy);
  fs.writeFileSync(path.join(legacy, 'settings.json'), '{"theme":"rider","language":"en"}');
  fs.writeFileSync(path.join(legacy, 'digitalocean.enc'), Buffer.from([0, 255, 12, 28]));
  fs.writeFileSync(
    path.join(legacy, 'Local State'),
    '{"os_crypt":{"encrypted_key":"fixture-only"}}',
  );
  fs.mkdirSync(path.join(legacy, 'Cache'));
  return { root, legacy, current };
}
test('旧配置与加密字节迁移完整，缓存不迁移，原文件可回退', (t) => {
  const { root, legacy, current } = fixture(t);
  assert.equal(prepareDataDirectory(root).migrated, true);
  for (const file of ['settings.json', 'digitalocean.enc', 'Local State'])
    assert.deepEqual(
      fs.readFileSync(path.join(current, file)),
      fs.readFileSync(path.join(legacy, file)),
    );
  assert.equal(fs.existsSync(path.join(current, 'Cache')), false);
  fs.writeFileSync(path.join(current, 'settings.json'), '{"theme":"anime"}');
  assert.equal(prepareDataDirectory(root).migrated, false);
  assert.equal(fs.readFileSync(path.join(current, 'settings.json'), 'utf8'), '{"theme":"anime"}');
  fs.unlinkSync(path.join(current, 'digitalocean.enc'));
  prepareDataDirectory(root);
  assert.equal(fs.existsSync(path.join(current, 'digitalocean.enc')), false);
});
test('全新安装与隔离诊断不读取真实旧配置', (t) => {
  const { root, current } = fixture(t);
  const isolated = path.join(root, 'isolated');
  assert.equal(prepareDataDirectory(root, isolated).directory, isolated);
  assert.equal(fs.existsSync(current), false);
  assert.equal(prepareDataDirectory(path.join(root, 'fresh')).migrated, false);
});
test('迁移失败继续使用原配置，不留下半成品目录或泄露凭据', (t) => {
  const { root, legacy, current } = fixture(t);
  const result = prepareDataDirectory(root, null, {
    ...fs,
    renameSync: () => {
      throw new Error('access denied');
    },
  });
  assert.equal(result.directory, legacy);
  assert.ok(result.warning);
  assert.equal(fs.existsSync(current), false);
  assert.deepEqual(fs.readdirSync(root), [compatibility.legacyDataDirectory]);
});
test('新品牌与安装升级身份一致且兼容既有安装 GUID', () => {
  const pkg = require('../package.json');
  assert.equal(pkg.build.appId, brand.appId);
  assert.equal(pkg.build.nsis.guid, compatibility.installerGuid);
  assert.equal(pkg.build.productName, brand.name);
});
