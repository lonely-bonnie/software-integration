// Run locally on Windows. Publishing is a separate explicit step.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const pkg = require('../package.json');
const output = path.resolve(root, pkg.build.directories.output.replace('${version}', pkg.version));
function run(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
run(require.resolve('prettier/bin/prettier.cjs'), [
  '--check',
  'src',
  'electron',
  'shared',
  'tests',
  'scripts',
  'package.json',
]);
const tests = fs
  .readdirSync(path.join(root, 'tests'))
  .filter((file) => file.endsWith('.test.cjs'))
  .map((file) => `tests/${file}`);
const tested = spawnSync(process.execPath, ['--test', ...tests], { cwd: root, stdio: 'inherit' });
if (tested.status !== 0) process.exit(tested.status || 1);
run(path.join(root, 'node_modules/typescript/bin/tsc'), ['--noEmit']);
run(path.join(root, 'node_modules/vite/bin/vite.js'), ['build']);
run(require.resolve('electron-builder/cli.js'), ['--win', 'nsis', 'portable', '--x64']);
const files = ['setup', 'portable'].map(
  (type) => `AstraDesk-${pkg.version}-windows-x64-${type}.exe`,
);
const checksums =
  files
    .map(
      (file) =>
        `${crypto
          .createHash('sha256')
          .update(fs.readFileSync(path.join(output, file)))
          .digest('hex')}  ${file}`,
    )
    .join('\n') + '\n';
fs.writeFileSync(path.join(output, `AstraDesk-${pkg.version}-SHA256SUMS.txt`), checksums);
console.log(`Release files and SHA256 checksums: ${output}`);
