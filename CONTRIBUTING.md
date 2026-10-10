# Contributing to AstraDesk

Use Node.js 24 and the committed lockfile. Do not submit tokens, account screenshots, user settings or machine-specific paths.

On a regular checkout: `npm ci`, then `npm test`, `npm run build`, and `npm run dev:desktop`.
On the maintainer's Windows workspace, dependencies live outside the checkout and are linked with a Junction; use `scripts/setup-development.ps1` rather than running `npm ci` in the source directory.

Before submitting changes, run Prettier on changed files, the core tests, and a production build. Check both languages and the 940 px minimum window width when changing the UI. Check the packaged desktop application when changing IPC, paths, credentials or lifecycle behavior.

New modules must document their data source, required permissions, states, and failure behavior. See [engineering boundaries](docs/ENGINEERING.md). A missing sample must not become zero; live failures must not become unlabeled demo data.

The repository is public, but currently does not grant an open-source reuse license (`UNLICENSED`). Theme artwork is AI-generated fan concept art and is not official artwork or an endorsement by the original franchises.
