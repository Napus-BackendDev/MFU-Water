import { writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// OSM-derived river only: tributaries are separate datasets. Never concatenate branches.
const page = `https://waterwaymap.org/river/${encodeURIComponent('แม่น้ำกก 000312531234')}/`;
const url = `${page}geometry.geojson`;
const targets = ['src/data/kokRiverOsm.json', 'public/kok-river-source.geojson', 'public/kok-river-source.json'];
for (const path of targets) {
  try { await access(new URL(`../${path}`, import.meta.url)); }
  catch (error) { if (error.code === 'ENOENT') continue; throw error; }
  throw new Error(`Refusing to overwrite ${path}`);
}
const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
if (!response.ok) throw new Error(`River download failed: ${response.status}`);
const chunks = [];
let size = 0;
for await (const chunk of response.body) {
  size += chunk.length;
  if (size > 2_000_000) throw new Error('Unexpected river download size');
  chunks.push(chunk);
}
const raw = Buffer.concat(chunks);
// Pin the inspected snapshot: changed upstream data needs a new provenance/direction review.
const expectedSha256 = 'b57ff28a5f4af90d3bea20550fab09bf49a61d10f896f6dde0639bac61dc9d09';
if (createHash('sha256').update(raw).digest('hex') !== expectedSha256) throw new Error('Source snapshot changed; verify identity, timestamp and main-stem direction before import');
const geometry = JSON.parse(raw.toString('utf8'));
if (geometry.type !== 'MultiLineString' || geometry.coordinates.length !== 5) throw new Error('Unexpected river geometry');
for (const part of geometry.coordinates) {
  if (part.length < 2) throw new Error('Incomplete channel');
  for (let i = 0; i < part.length; i++) {
    const point = part[i];
    if (point.length !== 2 || !point.every(Number.isFinite) || point[0] < 98 || point[0] > 101 || point[1] < 19 || point[1] > 22) throw new Error('Invalid river coordinate');
    if (i) {
      const previous = part[i - 1];
      const distance = Math.hypot((point[0] - previous[0]) * Math.cos(point[1] * Math.PI / 180), point[1] - previous[1]) * 111320;
      if (distance > 2000) throw new Error('Unexpected channel gap; do not bridge it');
    }
  }
}
const metadata = {
  source: 'OpenStreetMap contributors via WaterwayMap', sourceUrl: url, sourcePage: page,
  license: 'ODbL-1.0', licenseUrl: 'https://www.openstreetmap.org/copyright',
  osmDataTimestamp: '2026-04-22T18:05:07Z', retrievedAt: new Date().toISOString(),
  rawSha256: createHash('sha256').update(raw).digest('hex'),
  mainStemIndex: 0, partVertexCounts: geometry.coordinates.map(part => part.length),
  note: 'Coordinates preserved as supplied. Mapped channels, not measured water width, depth or flow speed.'
};
if (geometry.coordinates[0].length !== 3363) throw new Error('Source changed; verify main stem before import');
const feature = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: 'แม่น้ำกก', ...metadata }, geometry }] };
await writeFile(fileURLToPath(new URL(`../${targets[0]}`, import.meta.url)), `${JSON.stringify(feature)}\n`, { flag: 'wx' });
await writeFile(fileURLToPath(new URL(`../${targets[1]}`, import.meta.url)), raw, { flag: 'wx' });
await writeFile(fileURLToPath(new URL(`../${targets[2]}`, import.meta.url)), `${JSON.stringify(metadata, null, 2)}\n`, { flag: 'wx' });
console.log(`Imported ${size} bytes; ${metadata.partVertexCounts.join(', ')} vertices per channel; coordinates unchanged.`);
