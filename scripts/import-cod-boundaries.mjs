import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import mapshaper from 'mapshaper';
import { THAI_PROVINCE_NAMES } from '../src/components/KokWaterWatch/boundaryThaiLabels.js';
import { pointInGeometry } from '../src/components/KokWaterWatch/mapAreaNavigation.js';
import { provinceLabelAnchor } from '../src/components/KokWaterWatch/provinceLabels.js';

const cache = new URL('../scratch/cod-ab/', import.meta.url);
const target = new URL('../public/data/boundaries/', import.meta.url);
const source = JSON.parse(await readFile(new URL('source.json', cache)));
const sha = input => createHash('sha256').update(input).digest('hex');
const states = new Map();
const targetNames = ['thailand-provinces.geojson', 'thailand-navigation.geojson', ...Object.keys(THAI_PROVINCE_NAMES).map(code => `districts/${code}.geojson`)];
for (const name of [...targetNames, ...targetNames.map(name => `${name}.gz`), 'thailand-provinces.source.json']) {
  try { states.set(name, sha(await readFile(new URL(name, target)))); } catch (error) { if (error.code !== 'ENOENT') throw error; states.set(name, null); }
}
const load = async level => {
  const bytes = await readFile(new URL(`${level}.geojson`, cache));
  if (sha(bytes) !== source.hashes[level]) throw new Error('Source checksum mismatch');
  return JSON.parse(bytes);
};
const references = await load('adm1');
const raw = await load('adm2');
const referenceCodes = references.features.map(f => f.properties.adm1_pcode);
if (references.features.length !== 77 || new Set(referenceCodes).size !== 77 || referenceCodes.some(code => !THAI_PROVINCE_NAMES[code.replace('TH', 'TH-')])) throw new Error('Expected all 77 recognized provinces');
if (raw.features.length !== 928) throw new Error('Expected all 928 source districts');
const seen = new Set();
const groups = new Map();
const validateGeometry = geometry => {
  const polygons = geometry?.type === 'Polygon' ? [geometry.coordinates] : geometry?.type === 'MultiPolygon' ? geometry.coordinates : [];
  if (!polygons.length) throw new Error('Missing polygon geometry');
  for (const polygon of polygons) for (const ring of polygon) {
    if (ring.length < 4 || JSON.stringify(ring[0]) !== JSON.stringify(ring.at(-1))) throw new Error('Unclosed/empty boundary ring');
    if (ring.some(p => !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || p[0] < 97 || p[0] > 106 || p[1] < 5 || p[1] > 21)) throw new Error('Invalid WGS84 coordinate');
  }
};
const districts = { type: 'FeatureCollection', features: raw.features.map(f => {
  const p = f.properties, code = p.adm2_pcode, parent = p.adm1_pcode;
  if (!/^TH\d{4}$/.test(code) || seen.has(code) || !referenceCodes.includes(parent) || !code.startsWith(parent) || !/[ก-๙]/.test(p.adm2_name1 || '')) throw new Error(`Invalid district/code/name: ${code}`);
  seen.add(code);
  validateGeometry(f.geometry);
  const provinceCode = parent.replace('TH', 'TH-');
  const proposed = [p.center_lon, p.center_lat];
  const labelPoint = pointInGeometry(proposed, f.geometry) ? proposed : provinceLabelAnchor(f.geometry);
  if (!labelPoint) throw new Error(`No interior label anchor: ${code}`);
  const feature = { type: 'Feature', properties: { districtCode: code, provinceCode, nameTh: `${parent === 'TH10' ? 'เขต' : 'อำเภอ'}${p.adm2_name1}`, shapeName: p.adm2_name, shapeISO: code, shapeID: code, shapeGroup: 'THA', shapeType: 'ADM2', labelPoint }, geometry: f.geometry };
  if (!groups.has(provinceCode)) groups.set(provinceCode, []);
  groups.get(provinceCode).push(feature);
  return feature;
}) };
if (groups.size !== 77) throw new Error('A province has no districts');

async function transform(command, input) {
  const outputs = await mapshaper.applyCommands(`-i input.geojson ${command} -o output.geojson format=geojson geojson-type=FeatureCollection`, { 'input.geojson': input });
  return JSON.parse(outputs['output.geojson']);
}
console.log('Checking overlaps without repairing or snapping source geometry');
const overlaps = await transform('-mosaic calc="owners=count()" -filter "owners>1"', districts);
if (overlaps.features.length) {
  await writeFile(new URL('rejected-overlaps.geojson', cache), JSON.stringify(overlaps));
  throw new Error(`TOPOLOGY_GATE_FAILED: ${overlaps.features.length} overlapping district areas; published assets unchanged`);
}
console.log('Dissolving districts by province without geometry repair');
const provinces = await transform('-dissolve provinceCode no-repair', districts);
if (provinces.features.length !== 77) throw new Error('Dissolve lost provinces');
for (const feature of provinces.features) {
  const code = feature.properties.provinceCode;
  validateGeometry(feature.geometry);
  const reference = references.features.find(f => f.properties.adm1_pcode.replace('TH', 'TH-') === code);
  const proposed = [reference.properties.center_lon, reference.properties.center_lat];
  const labelPoint = pointInGeometry(proposed, feature.geometry) ? proposed : provinceLabelAnchor(feature.geometry);
  if (!labelPoint) throw new Error(`No province label anchor: ${code}`);
  feature.properties = { shapeISO: code, provinceCode: code, shapeName: reference.properties.adm1_name, nameTh: reference.properties.adm1_name1, shapeID: reference.properties.adm1_pcode, shapeGroup: 'THA', shapeType: 'ADM1', districtCount: groups.get(code).length, labelPoint };
}
// Gaps are checked against ADM1 from the SAME release, not the old OSM layer.
const referenceInput = { type: 'FeatureCollection', features: references.features.map(f => ({ ...f, properties: { provinceCode: f.properties.adm1_pcode.replace('TH', 'TH-') } })) };
const referenceUnion = await transform('-dissolve no-repair', referenceInput);
const country = await transform('-dissolve no-repair', provinces);
const delta = await mapshaper.applyCommands('-i actual.geojson expected.geojson combine-files -erase expected target=actual -o delta.geojson target=actual geojson-type=FeatureCollection', { 'actual.geojson': country, 'expected.geojson': referenceUnion });
const reverseDelta = await mapshaper.applyCommands('-i actual.geojson expected.geojson combine-files -erase actual target=expected -o delta.geojson target=expected geojson-type=FeatureCollection', { 'actual.geojson': country, 'expected.geojson': referenceUnion });
const differences = [JSON.parse(delta['delta.geojson']), JSON.parse(reverseDelta['delta.geojson'])];
if (differences.some(d => d.features.some(f => f.geometry))) {
  await writeFile(new URL('rejected-coverage.json', cache), JSON.stringify(differences));
  throw new Error('TOPOLOGY_GATE_FAILED: district coverage differs from same-release province coverage; published assets unchanged');
}
country.features[0].properties = { shapeName: 'Thailand', shapeISO: 'THA', shapeGroup: 'THA', shapeType: 'ADM0' };
const staging = new Map();
staging.set('thailand-provinces.geojson', JSON.stringify(provinces));
staging.set('thailand-navigation.geojson', JSON.stringify(country));
for (const [code, features] of groups) staging.set(`districts/${code}.geojson`, JSON.stringify({ type: 'FeatureCollection', features }));
// Lossless transfer compression: coordinates and canonical JSON remain unchanged.
for (const [name, content] of [...staging]) staging.set(`${name}.gz`, gzipSync(content, { level: 9 }));
staging.set('thailand-provinces.source.json', JSON.stringify({ ...source, provinces: 77, districts: 928, geometrySha256: sha(JSON.stringify(provinces.features.map(f => f.geometry))), transformations: 'ADM2 dissolved by authoritative parent PCODE; no simplify/snap/repair; province and country coverage derived from district geometry', topology: { overlappingAreas: 0, coverageDifferences: 0 }, files: Object.fromEntries([...staging].map(([name, content]) => [name, sha(content)])) }, null, 2));
// Preserve concurrent edits: compare the complete pre-write state before promotion.
await mkdir(new URL('districts/', target), { recursive: true });
for (const [name, content] of staging) {
  let current = null;
  try { current = sha(await readFile(new URL(name, target))); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (current !== states.get(name)) throw new Error(`CONCURRENT_MODIFICATION_DETECTED: ${name}`);
  await writeFile(new URL(name, target), content, states.get(name) === null ? { flag: 'wx' } : {});
}
console.log(`Published 77 provinces and ${seen.size} districts; source geometry preserved`);
