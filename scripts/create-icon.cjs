const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const root = path.join(__dirname, '..');
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([size, name, data, crc]);
}
function inside(x, y, poly) {
  let ok = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i],
      [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ok = !ok;
  }
  return ok;
}
function png(size) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(size * 4 + 1);
    for (let x = 0; x < size; x++) {
      const px = (x / size) * 32,
        py = (y / size) * 32;
      let color = [0, 0, 0, 0];
      if (
        inside(px, py, [
          [9, 4],
          [23, 4],
          [29, 12],
          [27, 24],
          [21, 29],
          [11, 29],
          [5, 24],
          [3, 12],
        ])
      )
        color = [35, 45, 51, 255];
      if (
        inside(px, py, [
          [5, 12],
          [13, 9],
          [14, 17],
          [8, 17],
        ])
      )
        color = [189, 223, 126, 255];
      if (
        inside(px, py, [
          [27, 12],
          [19, 9],
          [18, 17],
          [24, 17],
        ])
      )
        color = [189, 223, 126, 255];
      if (px >= 15 && px < 17 && py >= 2 && py < 22) color = [239, 96, 86, 255];
      if (px >= 11 && px < 21 && ((py >= 22 && py < 23) || (py >= 25 && py < 26)))
        color = [155, 177, 177, 255];
      for (let c = 0; c < 4; c++) row[1 + x * 4 + c] = color[c];
    }
    rows.push(row);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
fs.mkdirSync(path.join(root, 'build'), { recursive: true });
fs.writeFileSync(path.join(root, 'electron', 'tray.png'), png(32));
const image = png(256),
  ico = Buffer.alloc(22);
ico.writeUInt16LE(1, 2);
ico.writeUInt16LE(1, 4);
ico.writeUInt16LE(1, 10);
ico.writeUInt16LE(32, 12);
ico.writeUInt32LE(image.length, 14);
ico.writeUInt32LE(22, 18);
fs.writeFileSync(path.join(root, 'build', 'icon.ico'), Buffer.concat([ico, image]));
console.log('Original application and tray icons generated.');
