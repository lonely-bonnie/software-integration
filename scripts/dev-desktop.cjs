const { spawn } = require('node:child_process');
const path = require('node:path');
const root = path.join(__dirname, '..');
const vite = spawn(
  process.execPath,
  [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1'],
  { cwd: root, stdio: 'inherit', windowsHide: true },
);
let desktop,
  stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  desktop?.kill();
  vite.kill();
  process.exitCode = code;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
vite.on('error', (error) => {
  console.error(error.message);
  stop(1);
});
vite.on('exit', (code) => {
  if (!stopping) stop(code || 1);
});
(async () => {
  for (let attempt = 0; attempt < 80 && !stopping; attempt++) {
    try {
      const response = await fetch('http://127.0.0.1:5173/', { signal: AbortSignal.timeout(500) });
      if (!response.ok) throw new Error();
      desktop = spawn(require('electron'), ['.'], {
        cwd: root,
        stdio: 'inherit',
        windowsHide: true,
        env: { ...process.env, RIDER_DEV_URL: 'http://127.0.0.1:5173' },
      });
      desktop.on('error', (error) => {
        console.error(error.message);
        stop(1);
      });
      desktop.on('exit', (code) => stop(code || 0));
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  if (!stopping) {
    console.error('Vite startup timed out');
    stop(1);
  }
})();
