const path = require('node:path');
const { workspace, checkReleases } = require('./release-artifacts.cjs');
const releases = path.join(workspace, 'releases');
console.log(`${checkReleases(releases)} releases verified: ${releases}`);
