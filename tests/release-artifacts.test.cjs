const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  artifactNames,
  publishArtifacts,
  checkReleases,
} = require('../scripts/release-artifacts.cjs');

test('发行根目录只含按版本命名的正式文件，校验发现篡改且拒绝覆盖历史版本', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'astradesk-release-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const staging = path.join(root, 'staging');
  const releases = path.join(root, 'releases');
  fs.mkdirSync(staging);
  for (const file of artifactNames('0.2.1'))
    fs.writeFileSync(path.join(staging, file), 'fixture executable');
  publishArtifacts(staging, releases, '0.2.1');
  assert.equal(checkReleases(releases), 1);
  const original = fs.readFileSync(path.join(releases, 'index.json'));
  assert.throws(() => publishArtifacts(staging, releases, '0.2.1'), /already exists/);
  assert.deepEqual(fs.readFileSync(path.join(releases, 'index.json')), original);
  fs.appendFileSync(path.join(releases, artifactNames('0.2.1')[0]), 'modified');
  assert.throws(() => checkReleases(releases), /integrity failed/);
  assert.throws(() => artifactNames('../0.2.1'), /Invalid release version/);
});
test('缺失任一包时不产生半套发行文件，失败后可以重新发布', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'astradesk-release-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const staging = path.join(root, 'staging');
  const releases = path.join(root, 'releases');
  fs.mkdirSync(staging);
  fs.writeFileSync(path.join(staging, artifactNames('0.2.1')[0]), 'fixture');
  assert.throws(() => publishArtifacts(staging, releases, '0.2.1'), /ENOENT/);
  assert.deepEqual(fs.readdirSync(releases), []);
  fs.writeFileSync(path.join(staging, artifactNames('0.2.1')[1]), 'fixture');
  publishArtifacts(staging, releases, '0.2.1');
  assert.equal(checkReleases(releases), 1);
});
