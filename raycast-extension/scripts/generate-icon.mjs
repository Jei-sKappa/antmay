#!/usr/bin/env node
// One-shot helper: writes a 512x512 placeholder PNG for the Raycast extension.
// Drops a flat purple square at `assets/icon.png` so the manifest validates
// locally. Replace with a real icon before publishing.

import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const EXTENSION_ROOT = resolve(SCRIPT_DIR, "..");
const ICON_PATH = join(EXTENSION_ROOT, "assets", "icon.png");

const buildCrcTable = () => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
};

const CRC_TABLE = buildCrcTable();
const crc32 = (buf) => {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const typeBuf = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
};

const makeSolidPng = (size, rgba) => {
  const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowSize = size * 4;
  const raw = Buffer.alloc((rowSize + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (rowSize + 1)] = 0; // filter byte (None)
    for (let x = 0; x < size; x++) {
      const offset = y * (rowSize + 1) + 1 + x * 4;
      raw[offset] = rgba[0];
      raw[offset + 1] = rgba[1];
      raw[offset + 2] = rgba[2];
      raw[offset + 3] = rgba[3];
    }
  }

  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([SIG, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
};

const main = async () => {
  const force = process.argv.includes("--force");
  if (existsSync(ICON_PATH) && !force) {
    console.log(`Icon already exists at ${ICON_PATH} (pass --force to overwrite).`);
    return;
  }
  const png = makeSolidPng(512, [123, 92, 255, 255]); // Raycast-ish purple
  await writeFile(ICON_PATH, png);
  console.log(`Wrote placeholder icon (${png.length} bytes) to ${ICON_PATH}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
