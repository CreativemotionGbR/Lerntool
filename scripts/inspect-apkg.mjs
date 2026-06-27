import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import vm from 'node:vm';

const APKG_PATH = 'fixtures/anki/IT-Recht.apkg';
const VENDOR_FILES = ['vendor/zstd.js', 'vendor/sql-wasm.js', 'vendor/sql-wasm.wasm', 'vendor/jszip.min.js'];
const SQLITE_HEADER = new TextEncoder().encode('SQLite format 3');

function isZstdCompressed(bytes) {
  return bytes && bytes.length >= 4 && bytes[0] === 0x28 && bytes[1] === 0xb5 && bytes[2] === 0x2f && bytes[3] === 0xfd;
}

function looksLikeSqlite(bytes) {
  return bytes && bytes.length >= SQLITE_HEADER.length && SQLITE_HEADER.every((value, index) => bytes[index] === value);
}

async function exists(path) {
  try { await access(path, constants.F_OK); return true; }
  catch { return false; }
}

function readUInt16LE(bytes, offset) { return bytes[offset] | (bytes[offset + 1] << 8); }
function readUInt32LE(bytes, offset) { return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0; }

function findEndOfCentralDirectory(bytes) {
  const minOffset = Math.max(0, bytes.length - 0xffff - 22);
  for (let offset = bytes.length - 22; offset >= minOffset; offset -= 1) {
    if (readUInt32LE(bytes, offset) === 0x06054b50) return offset;
  }
  throw new Error('ZIP-Ende nicht gefunden.');
}

function readZipEntries(bytes) {
  const eocd = findEndOfCentralDirectory(bytes);
  const entryCount = readUInt16LE(bytes, eocd + 10);
  let offset = readUInt32LE(bytes, eocd + 16);
  const entries = [];
  for (let index = 0; index < entryCount; index += 1) {
    if (readUInt32LE(bytes, offset) !== 0x02014b50) throw new Error('Ungültiger ZIP-Central-Directory-Eintrag.');
    const compression = readUInt16LE(bytes, offset + 10);
    const compressedSize = readUInt32LE(bytes, offset + 20);
    const uncompressedSize = readUInt32LE(bytes, offset + 24);
    const nameLength = readUInt16LE(bytes, offset + 28);
    const extraLength = readUInt16LE(bytes, offset + 30);
    const commentLength = readUInt16LE(bytes, offset + 32);
    const localHeaderOffset = readUInt32LE(bytes, offset + 42);
    const name = new TextDecoder().decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    entries.push({ name, compression, compressedSize, uncompressedSize, localHeaderOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function extractStoredEntry(bytes, entry) {
  if (!entry) return null;
  if (entry.compression !== 0) throw new Error(`${entry.name} ist im ZIP komprimiert; das Prüfskript unterstützt für APKG-Collections nur gespeicherte Einträge.`);
  const offset = entry.localHeaderOffset;
  if (readUInt32LE(bytes, offset) !== 0x04034b50) throw new Error(`Lokaler ZIP-Header für ${entry.name} ist ungültig.`);
  const nameLength = readUInt16LE(bytes, offset + 26);
  const extraLength = readUInt16LE(bytes, offset + 28);
  const dataStart = offset + 30 + nameLength + extraLength;
  return bytes.slice(dataStart, dataStart + entry.compressedSize);
}

async function loadVendorFzstd() {
  if (!(await exists('vendor/zstd.js'))) return null;
  const code = await readFile('vendor/zstd.js', 'utf8');
  const sandbox = { globalThis: {}, self: {}, window: {}, atob: (value) => Buffer.from(value, 'base64').toString('binary') };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  vm.runInNewContext(code, sandbox, { filename: 'vendor/zstd.js' });
  return sandbox.fzstd?.decompress ? sandbox.fzstd : null;
}

const apkgBytes = await readFile(APKG_PATH);
const entries = readZipEntries(apkgBytes);
const byName = new Map(entries.map((entry) => [entry.name, entry]));

console.log(`APKG: ${APKG_PATH}`);
console.log('Enthaltene Dateien:');
for (const entry of entries) console.log(`- ${entry.name}: ${entry.uncompressedSize} Bytes`);

const anki21b = extractStoredEntry(apkgBytes, byName.get('collection.anki21b'));
const anki2 = extractStoredEntry(apkgBytes, byName.get('collection.anki2'));
console.log(`collection.anki21b vorhanden: ${!!anki21b}`);
console.log(`collection.anki21b Zstandard-Magic-Bytes: ${isZstdCompressed(anki21b)}`);
console.log(`collection.anki2 vorhanden: ${!!anki2}`);
console.log(`collection.anki2 SQLite format 3: ${looksLikeSqlite(anki2)}`);

for (const file of VENDOR_FILES) console.log(`${file} existiert: ${await exists(file)}`);

if (anki21b && isZstdCompressed(anki21b)) {
  const fzstd = await loadVendorFzstd();
  if (!fzstd) {
    console.log('Zstandard-Test: vendor/zstd.js stellt globalThis.fzstd.decompress nicht bereit.');
  } else {
    try {
      const decompressed = fzstd.decompress(anki21b);
      const bytes = decompressed instanceof Uint8Array ? decompressed : new Uint8Array(decompressed);
      console.log(`Zstandard-Test: entpackt ${bytes.length} Bytes`);
      console.log(`Entpackte collection.anki21b SQLite format 3: ${looksLikeSqlite(bytes)}`);
    } catch (error) {
      console.log(`Zstandard-Test fehlgeschlagen: ${error.message}`);
    }
  }
}
