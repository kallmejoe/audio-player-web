import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

const SIZE = 512;
const OUTPUT = path.resolve('assets/icon.png');

function createPixelData(width, height) {
  const data = Buffer.alloc(width * height * 4);
  const cx = width / 2;
  const cy = height / 2;
  const outerR = width * 0.42;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= outerR) {
        const t = dist / outerR;
        const angle = Math.atan2(dy, dx);
        const isNote = Math.abs(dy + outerR * 0.15) < 12 && Math.abs(dx) < outerR * 0.35;
        const isHead = Math.abs(dy) < outerR * 0.2 && Math.abs(dx + outerR * 0.15) < outerR * 0.2;

        if ((isNote || isHead) && dist > outerR * 0.25) {
          data[idx] = 255;
          data[idx + 1] = 255;
          data[idx + 2] = 255;
          data[idx + 3] = 255;
        } else {
          data[idx] = Math.floor(250 - t * 60);
          data[idx + 1] = Math.floor(36 + t * 10);
          data[idx + 2] = Math.floor(60 + t * 20);
          data[idx + 3] = 255;
        }
      } else {
        data[idx] = 6;
        data[idx + 1] = 6;
        data[idx + 2] = 8;
        data[idx + 3] = 0;
      }
    }
  }
  return data;
}

function crc32(buf) {
  let crc = -1;
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeB, data]);
  const crcV = Buffer.alloc(4);
  crcV.writeUInt32BE(crc32(crcData));
  return Buffer.concat([len, typeB, data, crcV]);
}

function createPNG(width, height, pixelData) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    pixelData.copy(row, 1, y * width * 4, (y + 1) * width * 4);
    rawRows.push(row);
  }

  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData, { level: 9 });

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const pixelData = createPixelData(SIZE, SIZE);
const png = createPNG(SIZE, SIZE, pixelData);
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, png);
console.log(`✓ Icon generated: ${OUTPUT} (${(png.length / 1024).toFixed(1)} KB)`);
