import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import mapshaper from 'mapshaper';
import { THAI_REGIONS, regionForProvince } from '../src/components/KokWaterWatch/mapAreaNavigation.js';

const root = new URL('../public/data/boundaries/', import.meta.url);
const raw = await readFile(new URL('thailand-provinces.geojson', root));
const provinces = JSON.parse(raw);
const input = { ...provinces, features: provinces.features.map(f => ({ ...f, properties: { regionId: regionForProvince(f.properties.shapeISO) } })) };
if (input.features.length !== 77 || input.features.some(f => !f.properties.regionId)) throw new Error('Invalid province partition');
const outputs = await mapshaper.applyCommands('-i input.geojson -dissolve regionId no-repair -o regions.geojson format=geojson geojson-type=FeatureCollection', { 'input.geojson': input });
const regions = JSON.parse(outputs['regions.geojson']);
if (regions.features.length !== 4) throw new Error('Lost region geometry');
const files = new Map([['thailand-regions.geojson', JSON.stringify(regions)]]);
for (const region of THAI_REGIONS) {
  const features = provinces.features.filter(f => regionForProvince(f.properties.shapeISO) === region.id);
  if (features.length !== region.provinceCodes.length) throw new Error('Missing provinces');
  files.set(`regions/${region.id}-provinces.geojson`, JSON.stringify({ type: 'FeatureCollection', features }));
}
await mkdir(new URL('regions/', root), { recursive: true });
for (const [name, content] of files) {
  await writeFile(new URL(name, root), content, { flag: 'wx' });
  await writeFile(new URL(`${name}.gz`, root), gzipSync(content, { level: 9 }), { flag: 'wx' });
}
const hash = data => createHash('sha256').update(data).digest('hex');
await writeFile(new URL('navigation-levels.source.json', root), JSON.stringify({ source: 'Thailand COD-AB, existing verified province asset', license: 'CC BY-IGO', sourceSha256: hash(raw), transform: 'dissolve regionId no-repair; province shards preserve exact features', files: Object.fromEntries([...files].map(([name, content]) => [name, { sha256: hash(content), bytes: Buffer.byteLength(content), gzipBytes: gzipSync(content).length }])) }, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ oldProvinceGzip: gzipSync(raw).length, regionGzip: gzipSync(files.get('thailand-regions.geojson')).length, files: [...files.keys()] }));
