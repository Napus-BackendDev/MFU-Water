import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import mapshaper from 'mapshaper';
import GZip from 'numcodecs/gzip';
import Zlib from 'numcodecs/zlib';

const require = createRequire(import.meta.url);
const mapRequire = createRequire(require.resolve('mapshaper'));
const AdmZip = mapRequire('adm-zip');
const fixture = { type: 'FeatureCollection', features: [0, 1].map(x => ({
  type: 'Feature', properties: { provinceCode: 'fixture' },
  geometry: { type: 'Polygon', coordinates: [[[x, 0], [x + 1, 0], [x + 1, 1], [x, 1], [x, 0]]] }
})) };

test('patched ZIP API and Mapshaper GeoJSON import/dissolve/export stay compatible in memory', async () => {
  assert.equal(mapRequire('adm-zip/package.json').version, '0.6.1');
  const archive = new AdmZip();
  archive.addFile('input.geojson', Buffer.from(JSON.stringify(fixture)));
  const bytes = archive.toBuffer();
  const parsed = new AdmZip(bytes);
  assert.equal(parsed.getEntries().length, 1);
  assert.deepEqual(JSON.parse(parsed.getEntries()[0].getData()), fixture);
  assert.throws(() => new AdmZip(bytes.subarray(0, 8)).getEntries());
  const outputs = await mapshaper.applyCommands('-i input.zip -dissolve provinceCode no-repair -o output.geojson format=geojson geojson-type=FeatureCollection', { 'input.zip': bytes });
  const result = JSON.parse(outputs['output.geojson']);
  assert.equal(result.features.length, 1);
  assert.equal(result.features[0].properties.provinceCode, 'fixture');
  assert.equal(result.features[0].geometry.type, 'Polygon');
  assert.ok(result.features[0].geometry.coordinates[0].some(point => point[0] === 2));
});

test('numcodecs still round-trips gzip/zlib with patched fflate and rejects malformed input', () => {
  const input = new TextEncoder().encode('boundary tool fixture only');
  for (const codec of [new GZip(), new Zlib()]) {
    assert.deepEqual(codec.decode(codec.encode(input)), input);
    assert.throws(() => codec.decode(new Uint8Array([0, 1, 2])));
  }
});
