// Run locally on Windows. Publishing is a separate explicit step.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const {
  workspace,
  assertUnreleased,
  publishArtifacts,
  checkReleases,
} = require('./release-artifacts.cjs');
const root = path.resolve(__dirname, '..');
const pkg = require('../package.json');
const output = path.join(workspace, '.build', pkg.version);
const releases = path.join(workspace, 'releases');
// Refuse before building if this version has already been delivered.
assertUnreleased(releases, pkg.version);
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
run(require.resolve('electron-builder/cli.js'), [
  '--win',
  'nsis',
  'portable',
  '--x64',
  `--config.directories.output=${output}`,
]);
publishArtifacts(output, releases, pkg.version);
checkReleases(releases);
console.log(`Versioned installers, portable EXEs and SHA256 checksums: ${releases}`);
console.log(`Temporary packaging output: ${output}. Run npm run clean after package validation.`);
