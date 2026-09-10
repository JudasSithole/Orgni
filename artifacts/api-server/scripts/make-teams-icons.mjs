/**
 * Generates the two Teams app icons into src/teams/assets/:
 *   color.png    192x192, solid Orgni orange with a white "O"
 *   outline.png   32x32, transparent with a white "O" ring
 *
 * Pure Node (zlib) — no image library. Run: node scripts/make-teams-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/teams/assets",
);
mkdirSync(outDir, { recursive: true });

const ORANGE = [0xfe, 0x51, 0x01, 0xff];
const WHITE = [0xff, 0xff, 0xff, 0xff];
const CLEAR = [0, 0, 0, 0];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

/** pixel(x,y) -> [r,g,b,a] */
function png(size, pixel) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
      raw[o++] = r;
      raw[o++] = g;
      raw[o++] = b;
      raw[o++] = a;
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Distance from a ring of radius r centred in a `size` box. */
function ring(x, y, size, rOuter, rInner) {
  const cx = size / 2 - 0.5;
  const cy = size / 2 - 0.5;
  const d = Math.hypot(x - cx, y - cy);
  return d <= rOuter && d >= rInner;
}

// color.png — orange field, white O
const color = png(192, (x, y) =>
  ring(x, y, 192, 66, 40) ? WHITE : ORANGE,
);
writeFileSync(path.join(outDir, "color.png"), color);

// outline.png — transparent, white O
const outline = png(32, (x, y) =>
  ring(x, y, 32, 13, 8) ? WHITE : CLEAR,
);
writeFileSync(path.join(outDir, "outline.png"), outline);

console.log("wrote", path.join(outDir, "color.png"), "and outline.png");
