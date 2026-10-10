const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const workspace = path.resolve(
  process.env.ASTRADESK_WORKSPACE || path.join(__dirname, '../../AstraDesk-Dev'),
);
function artifactNames(version) {
  if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version)) throw new Error('Invalid release version');
  return ['setup', 'portable'].map((type) => `AstraDesk-${version}-windows-x64-${type}.exe`);
}
function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function readIndex(directory) {
  const file = path.join(directory, 'index.json');
  return fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, 'utf8'))
    : { schemaVersion: 1, releases: [] };
}
function assertUnreleased(directory, version) {
  const files = [...artifactNames(version), `AstraDesk-${version}-SHA256SUMS.txt`];
  if (
    readIndex(directory).releases.some((release) => release.version === version) ||
    files.some((file) => fs.existsSync(path.join(directory, file)))
  )
    throw new Error(
      `Version ${version} already exists. Bump the version; published files are immutable.`,
    );
}
function publishArtifacts(staging, directory, version) {
  fs.mkdirSync(directory, { recursive: true });
  const lockPath = path.join(directory, '.release-lock');
  const lock = fs.openSync(lockPath, 'wx');
  const created = [];
  const tempIndex = path.join(directory, '.index.json.tmp');
  try {
    assertUnreleased(directory, version);
    const names = artifactNames(version);
    const assets = names.map((file) => ({
      file,
      type: file.endsWith('-setup.exe') ? 'installer' : 'portable',
      bytes: fs.statSync(path.join(staging, file)).size,
      sha256: sha256(path.join(staging, file)),
    }));
    for (const asset of assets) {
      const destination = path.join(directory, asset.file);
      fs.copyFileSync(path.join(staging, asset.file), destination, fs.constants.COPYFILE_EXCL);
      created.push(destination);
      if (sha256(destination) !== asset.sha256) throw new Error('Release checksum mismatch');
    }
    const sumsName = `AstraDesk-${version}-SHA256SUMS.txt`;
    const sums = assets.map((asset) => `${asset.sha256}  ${asset.file}`).join('\n') + '\n';
    const sumsPath = path.join(directory, sumsName);
    fs.writeFileSync(sumsPath, sums, { flag: 'wx' });
    created.push(sumsPath);
    assets.push({
      file: sumsName,
      type: 'checksums',
      bytes: fs.statSync(sumsPath).size,
      sha256: sha256(sumsPath),
    });
    const index = readIndex(directory);
    index.releases.push({ version, channel: 'beta', assets });
    fs.writeFileSync(tempIndex, JSON.stringify(index, null, 2) + '\n', { flag: 'wx' });
    fs.renameSync(tempIndex, path.join(directory, 'index.json'));
    return assets;
  } catch (error) {
    for (const file of created) fs.unlinkSync(file);
    throw error;
  } finally {
    if (fs.existsSync(tempIndex)) fs.unlinkSync(tempIndex);
    fs.closeSync(lock);
    fs.unlinkSync(lockPath);
  }
}
function checkReleases(directory) {
  const index = readIndex(directory);
  if (index.schemaVersion !== 1 || !index.releases.length)
    throw new Error('Invalid or empty release index');
  const declared = new Set(['index.json', 'README.md']);
  const versions = new Set();
  for (const release of index.releases) {
    artifactNames(release.version);
    if (versions.has(release.version)) throw new Error('Duplicate release version');
    versions.add(release.version);
    const binaryAssets = release.assets.filter((asset) => asset.type !== 'checksums');
    for (const asset of release.assets) {
      if (
        path.basename(asset.file) !== asset.file ||
        !asset.file.startsWith(`AstraDesk-${release.version}-`) ||
        declared.has(asset.file)
      )
        throw new Error('Invalid or duplicate artifact name');
      declared.add(asset.file);
      const file = path.join(directory, asset.file);
      if (
        !fs.lstatSync(file).isFile() ||
        fs.statSync(file).size !== asset.bytes ||
        sha256(file) !== asset.sha256
      )
        throw new Error(`Release integrity failed: ${asset.file}`);
      if (asset.type === 'checksums') {
        const expected = binaryAssets.map((binary) => `${binary.sha256}  ${binary.file}`).sort();
        const actual = fs.readFileSync(file, 'utf8').trimEnd().split(/\r?\n/).sort();
        if (JSON.stringify(actual) !== JSON.stringify(expected))
          throw new Error(`Checksum list mismatch: ${asset.file}`);
      }
    }
    if (!release.assets.some((asset) => asset.type === 'checksums'))
      throw new Error('Missing checksum list');
  }
  for (const file of fs.readdirSync(directory))
    if (!declared.has(file)) throw new Error(`Unexpected file in releases: ${file}`);
  return index.releases.length;
}
module.exports = {
  workspace,
  artifactNames,
  sha256,
  assertUnreleased,
  publishArtifacts,
  checkReleases,
};
