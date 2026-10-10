// Derive application assets from the selected hero. No image-processing dependency required.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const electron = require('electron');
const root = path.join(__dirname, '..');
if (typeof electron === 'string') {
  // Windows Start-Process avoids Chromium's nested job-object launch limitation.
  const executable = process.platform === 'win32' ? 'powershell.exe' : electron;
  const args =
    process.platform === 'win32'
      ? [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          path.join(__dirname, 'render-icons.ps1'),
          '-ElectronPath',
          electron,
          '-ScriptPath',
          __filename,
          '-ProjectPath',
          root,
        ]
      : [__filename, '--render'];
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const result = spawnSync(executable, args, {
    cwd: root,
    windowsHide: true,
    stdio: 'inherit',
    env,
  });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
} else {
  const { app, nativeImage } = electron;
  app.whenReady().then(() => {
    try {
      const artwork = nativeImage.createFromPath(path.join(root, 'public', 'rider-hero-v2.png'));
      if (artwork.isEmpty()) throw new Error('Selected hero artwork is missing');
      const size = artwork.getSize();
      // A square close-up keeps the blue visor and red center stripe readable at icon sizes.
      const side = Math.round(size.height * 0.75);
      const portrait = artwork.crop({
        x: Math.round(size.width * 0.615),
        y: Math.round(size.height * 0.04),
        width: side,
        height: side,
      });
      const png = (width) => portrait.resize({ width, height: width, quality: 'best' }).toPNG();
      fs.mkdirSync(path.join(root, 'build'), { recursive: true });
      fs.writeFileSync(path.join(root, 'public', 'rider-mark-v2.png'), png(128));
      fs.writeFileSync(path.join(root, 'electron', 'app-icon.png'), png(256));
      fs.writeFileSync(path.join(root, 'electron', 'tray.png'), png(32));
      const sizes = [256, 48, 32, 16];
      const images = sizes.map(png);
      const header = Buffer.alloc(6 + sizes.length * 16);
      header.writeUInt16LE(1, 2);
      header.writeUInt16LE(sizes.length, 4);
      let offset = header.length;
      sizes.forEach((size, index) => {
        const entry = 6 + index * 16;
        header[entry] = size === 256 ? 0 : size;
        header[entry + 1] = size === 256 ? 0 : size;
        header.writeUInt16LE(1, entry + 4);
        header.writeUInt16LE(32, entry + 6);
        header.writeUInt32LE(images[index].length, entry + 8);
        header.writeUInt32LE(offset, entry + 12);
        offset += images[index].length;
      });
      fs.writeFileSync(path.join(root, 'build', 'icon.ico'), Buffer.concat([header, ...images]));
      console.log('Hero portrait, Windows icon and tray icon generated.');
      app.exit(0);
    } catch (error) {
      console.error(error.message);
      app.exit(1);
    }
  });
}
