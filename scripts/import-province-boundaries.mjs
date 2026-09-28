// Reproducible import: retain every coordinate from the pinned, full-resolution source.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { THAI_PROVINCE_NAMES } from '../src/components/KokWaterWatch/boundaryThaiLabels.js';

throw new Error('Retired mixed-release importer. Use scripts/download-cod-boundaries.mjs then scripts/import-cod-boundaries.mjs; both administrative levels must share the COD-AB release.');

const source = 'https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/THA/ADM1/geoBoundaries-THA-ADM1.geojson';
const target = new URL('../public/data/boundaries/thailand-provinces.geojson', import.meta.url);
const before = await readFile(target);
const response = await fetch(source);
if (!response.ok) throw new Error(`Boundary download failed: ${response.status}`);
const raw = await response.text();
const data = JSON.parse(raw);
const codes = data.features?.map(feature => feature.properties.shapeISO);
if (data.type !== 'FeatureCollection' || codes.length !== 77 || new Set(codes).size !== 77 || codes.some(code => !THAI_PROVINCE_NAMES[code])) {
  throw new Error('Expected 77 unique, recognized Thai provinces');
}
const geometryText = JSON.stringify(data.features.map(feature => feature.geometry));
const sha256 = value => createHash('sha256').update(value).digest('hex');
if (sha256(await readFile(target)) !== sha256(before)) throw new Error('CONCURRENT_MODIFICATION_DETECTED');
await writeFile(target, JSON.stringify(data));
await writeFile(new URL('../public/data/boundaries/thailand-provinces.source.json', import.meta.url), JSON.stringify({
  source, metadata: 'https://www.geoboundaries.org/api/current/gbOpen/THA/ADM1/',
  boundaryID: 'THA-ADM1-36821470', yearRepresented: 2017,
  attribution: 'geoBoundaries / OpenStreetMap contributors / Wambacher',
  license: 'Open Data Commons Open Database License 1.0',
  licenseURL: 'https://opendatacommons.org/licenses/odbl/1-0/',
  sourceSha256: sha256(raw), geometrySha256: sha256(geometryText),
  transformations: 'JSON whitespace only; no coordinate changes or simplification',
  provinces: codes.length
}, null, 2) + '\n');
console.log(`Imported ${codes.length} provinces without coordinate changes`);
