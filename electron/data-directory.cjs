const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const brand = require('../shared/brand.json');
const compatibility = require('../shared/compatibility.json');

// Copy durable settings, encrypted credentials and Chromium's wrapped encryption key.
// Local State is required to decrypt safeStorage ciphertext in a different userData directory.
// Leave the original intact for rollback.
// A complete migration appears atomically; an existing new directory always wins.
function prepareDataDirectory(appData, override, io = fs) {
  if (override) return { directory: path.resolve(override), migrated: false };
  const directory = path.join(appData, brand.dataDirectory);
  const legacy = path.join(appData, compatibility.legacyDataDirectory);
  if (io.existsSync(directory) || !io.existsSync(legacy)) return { directory, migrated: false };
  const files = ['settings.json', 'digitalocean.enc', 'Local State'].filter((file) =>
    io.existsSync(path.join(legacy, file)),
  );
  if (!files.length) return { directory, migrated: false };
  let staging;
  try {
    staging = io.mkdtempSync(path.join(appData, '.astradesk-migration-'));
    for (const file of files) {
      const source = path.join(legacy, file);
      if (!io.lstatSync(source).isFile()) throw new Error('Unexpected migration file');
      const data = io.readFileSync(source);
      const target = path.join(staging, file);
      io.writeFileSync(target, data, { flag: 'wx' });
      const hash = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
      if (hash(data) !== hash(io.readFileSync(target)))
        throw new Error('Migration checksum mismatch');
    }
    io.renameSync(staging, directory);
    return { directory, migrated: true };
  } catch {
    // A competing instance may have completed migration. Never replace its data.
    if (io.existsSync(directory)) return { directory, migrated: false };
    return {
      directory: legacy,
      migrated: false,
      warning: '旧配置迁移失败，仍使用原数据目录；请检查数据目录权限后重启',
    };
  } finally {
    if (staging && io.existsSync(staging)) io.rmSync(staging, { recursive: true, force: true });
  }
}
module.exports = { prepareDataDirectory };
