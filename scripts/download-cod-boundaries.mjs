// Download only ADM1/ADM2 ZIP members; never transfer the much larger ADM3 layer.
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createWriteStream, createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createInflateRaw } from 'node:zlib';
import { createHash } from 'node:crypto';

const cache = new URL('../scratch/cod-ab/', import.meta.url);
await mkdir(cache, { recursive: true });
const metadataURL = 'https://data.humdata.org/api/3/action/package_show?id=cod-ab-tha';
const metadata = (await (await fetch(metadataURL, { signal: AbortSignal.timeout(30000) })).json()).result;
if (metadata.license_id !== 'cc-by-igo') throw new Error('Unexpected source license');
const resource = metadata.resources.find(item => item.format === 'GeoJSON');
const head = await fetch(resource.url, { method: 'HEAD', signal: AbortSignal.timeout(30000) });
if (!head.ok || head.headers.get('accept-ranges') !== 'bytes') throw new Error('Source must support bounded ZIP range download');
const size = Number(head.headers.get('content-length'));
const etag = head.headers.get('etag');
if (!etag || !Number.isSafeInteger(size) || size <= 0) throw new Error('Missing immutable archive identity');
let previousSource = null;
try { previousSource = JSON.parse(await readFile(new URL('source.json', cache))); } catch {}
async function range(start, end) {
  // HDX signs redirects per HTTP method: do not reuse a HEAD-signed S3 URL.
  const response = await fetch(resource.url, { headers: { Range: `bytes=${start}-${end}`, 'If-Match': etag }, signal: AbortSignal.timeout(600000) });
  if (response.status !== 206 || response.headers.get('content-range') !== `bytes ${start}-${end}/${size}`) throw new Error(`Invalid ZIP range response: ${response.status}`);
  return response;
}
const tail = Buffer.from(await (await range(Math.max(0, size - 65557), size - 1)).arrayBuffer());
let eocd = tail.length - 22;
while (eocd >= 0 && tail.readUInt32LE(eocd) !== 0x06054b50) eocd--;
if (eocd < 0) throw new Error('ZIP end record not found');
const centralSize = tail.readUInt32LE(eocd + 12), centralOffset = tail.readUInt32LE(eocd + 16);
const directory = Buffer.from(await (await range(centralOffset, centralOffset + centralSize - 1)).arrayBuffer());
const entries = [];
for (let pos = 0; pos < directory.length;) {
  if (directory.readUInt32LE(pos) !== 0x02014b50) throw new Error('Invalid ZIP directory');
  const nameLength = directory.readUInt16LE(pos + 28), extra = directory.readUInt16LE(pos + 30), comment = directory.readUInt16LE(pos + 32);
  entries.push({ name: directory.toString('utf8', pos + 46, pos + 46 + nameLength), method: directory.readUInt16LE(pos + 10), compressedSize: directory.readUInt32LE(pos + 20), size: directory.readUInt32LE(pos + 24), offset: directory.readUInt32LE(pos + 42) });
  pos += 46 + nameLength + extra + comment;
}
console.log(JSON.stringify(entries));
const selected = entries.filter(entry => /admin[12]/i.test(entry.name) && /\.geojson$/i.test(entry.name));
if (selected.length !== 2) throw new Error('Expected exactly ADM1 and ADM2 GeoJSON members');
const hashes = {};
for (const entry of selected) {
  const level = /admin1/i.test(entry.name) ? 'adm1' : 'adm2';
  const target = new URL(`${level}.geojson`, cache);
  const header = Buffer.from(await (await range(entry.offset, entry.offset + 29)).arrayBuffer());
  if (header.readUInt32LE(0) !== 0x04034b50 || entry.method !== 8) throw new Error('Unsupported ZIP member');
  const start = entry.offset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28);
  let complete = false;
  try {
    complete = previousSource?.archiveETag === etag && previousSource.resourceURL === resource.url && (await stat(target)).size === entry.size;
    if (complete) {
      const existing = createHash('sha256');
      for await (const chunk of createReadStream(target)) existing.update(chunk);
      complete = existing.digest('hex') === previousSource.hashes[level];
    }
  } catch {}
  if (!complete) {
    console.log(`Downloading ${level}: ${entry.compressedSize} compressed bytes`);
    // Scratch files may be retried; published assets are untouched here.
    await pipeline(Readable.fromWeb((await range(start, start + entry.compressedSize - 1)).body), createInflateRaw(), createWriteStream(target));
  }
  if ((await stat(target)).size !== entry.size) throw new Error('Incomplete ZIP member');
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(target)) digest.update(chunk);
  hashes[level] = digest.digest('hex');
  const file = await readFile(target, 'utf8');
  const collection = JSON.parse(file);
  console.log(JSON.stringify({ level, features: collection.features.length, firstProperties: collection.features[0].properties }));
}
await writeFile(new URL('source.json', cache), JSON.stringify({ metadataURL, resourceURL: resource.url, archiveETag: etag, archiveBytes: size, license: metadata.license_title, licenseId: metadata.license_id, datasetDate: metadata.dataset_date, notes: metadata.notes, hashes }, null, 2));
