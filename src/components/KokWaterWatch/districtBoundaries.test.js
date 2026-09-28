import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { THAI_PROVINCE_NAMES } from './boundaryThaiLabels.js';
import { pointInGeometry } from './mapAreaNavigation.js';
import { districtLabelsForArea, provinceLabelsForArea } from './provinceLabels.js';
import { createBoundaryLoader } from './boundaryLoader.js';

const root = new URL('../../../public/data/boundaries/', import.meta.url);
const metadata = JSON.parse(readFileSync(new URL('thailand-provinces.source.json', root)));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('77 province shards contain exactly 928 unique Thai districts with authoritative parents and valid interior labels', () => {
  const codes = new Set();
  let count = 0;
  for (const provinceCode of Object.keys(THAI_PROVINCE_NAMES)) {
    const path = `districts/${provinceCode}.geojson`;
    const bytes = readFileSync(new URL(path, root));
    assert.equal(sha(bytes), metadata.files[path]);
    assert.deepEqual(gunzipSync(readFileSync(new URL(`${path}.gz`, root))), bytes, 'Compression cannot change coordinates');
    const data = JSON.parse(bytes);
    assert.ok(data.features.length > 0);
    const labels = districtLabelsForArea(data.features, { level: 'province', provinceIso: provinceCode });
    assert.equal(labels.length, data.features.length);
    assert.deepEqual(provinceLabelsForArea([], { level: 'province', provinceIso: provinceCode }), []);
    for (const feature of data.features) {
      const { districtCode, nameTh, labelPoint } = feature.properties;
      assert.equal(feature.properties.provinceCode, provinceCode);
      assert.match(districtCode, new RegExp(`^${provinceCode.replace('-', '')}\\d{2}$`));
      assert.equal(codes.has(districtCode), false);
      codes.add(districtCode);
      assert.match(nameTh, provinceCode === 'TH-10' ? /^เขต[ก-๙]/ : /^อำเภอ[ก-๙]/);
      assert.equal(pointInGeometry(labelPoint, feature.geometry), true, districtCode);
      assert.equal(districtLabelsForArea(data.features, { level: 'district', provinceIso: provinceCode, districtCode }).length, 1);
    }
    assert.equal(districtLabelsForArea(data.features, { level: 'country' }).length, 0);
    assert.equal(districtLabelsForArea(data.features, { level: 'region', regionId: 'north' }).length, 0);
    count += data.features.length;
  }
  assert.equal(count, 928);
  assert.equal(codes.size, 928);
});

test('province geometry and country remain hash-pinned to verified district dissolve, including Phan', () => {
  const data = JSON.parse(readFileSync(new URL('thailand-provinces.geojson', root)));
  assert.equal(sha(JSON.stringify(data.features.map(f => f.geometry))), metadata.geometrySha256);
  assert.equal(metadata.hashes.adm2, '65b44f60dec9c0e888fefe883b073e2688557230988edd69867ec63483b95160');
  assert.deepEqual(metadata.topology, { overlappingAreas: 0, coverageDifferences: 0 });
  for (const feature of data.features) {
    assert.equal(pointInGeometry(feature.properties.labelPoint, feature.geometry), true);
    const districts = JSON.parse(readFileSync(new URL(`districts/${feature.properties.provinceCode}.geojson`, root)));
    assert.equal(districts.features.length, feature.properties.districtCount);
    for (const district of districts.features) assert.equal(pointInGeometry(district.properties.labelPoint, feature.geometry), true, district.properties.districtCode);
  }
  const rai = data.features.find(f => f.properties.provinceCode === 'TH-57');
  const historicalPoint = [99.63471161400008, 19.387806751000028];
  // The old mixed-release Phan vertex is Lampang in BOTH official ADM1 and ADM2.
  // Do not distort Chiang Rai to retain an incorrect historical assignment.
  assert.equal(pointInGeometry(historicalPoint, rai.geometry), false);
  assert.equal(pointInGeometry(historicalPoint, data.features.find(f => f.properties.provinceCode === 'TH-52').geometry), true);
  const phan = JSON.parse(readFileSync(new URL('districts/TH-57.geojson', root))).features.find(f => f.properties.districtCode === 'TH5705');
  assert.equal(phan.properties.nameTh, 'อำเภอพาน');
  assert.equal(pointInGeometry(phan.properties.labelPoint, phan.geometry), true);
  assert.equal(pointInGeometry(phan.properties.labelPoint, rai.geometry), true);
});

test('district loader isolates provinces, shares requests, rejects wrong parents and retries failures', async () => {
  const paths = [];
  let wrong = true;
  const load = createBoundaryLoader(async path => {
    paths.push(path);
    const parent = path.includes('TH-50') && !wrong ? 'TH-50' : 'TH-57';
    return { ok: true, json: async () => ({ features: [{ properties: { provinceCode: parent, districtCode: `${parent.replace('-', '')}01`, nameTh: 'อำเภอเมือง' } }] }) };
  });
  await assert.rejects(load.loadDistricts('TH-50'), /does not match/);
  wrong = false;
  const [a, b] = await Promise.all([load.loadDistricts('TH-50'), load.loadDistricts('TH-50')]);
  assert.equal(a, b);
  assert.equal(paths.length, 2);
  const rai = await load.loadDistricts('TH-57');
  assert.notEqual(rai, a);
  await assert.rejects(load.loadDistricts('../TH-50'), /Unknown boundary/);
  assert.equal(paths.length, 3);
});

test('browser loader losslessly decodes streamed gzip once', async () => {
  let calls = 0;
  const payload = { type: 'FeatureCollection', features: [] };
  const load = createBoundaryLoader(async path => {
    calls++;
    assert.match(path, /\.geojson\.gz$/);
    return new Response(gzipSync(JSON.stringify(payload)));
  });
  assert.deepEqual(await load('provinces'), payload);
  assert.deepEqual(await load('provinces'), payload);
  assert.equal(calls, 1);
});

test('loader does not decompress twice when HTTP already decoded Content-Encoding gzip', async () => {
  const payload = { type: 'FeatureCollection', features: [] };
  const load = createBoundaryLoader(async () => new Response(JSON.stringify(payload), { headers: { 'content-encoding': 'gzip' } }));
  assert.deepEqual(await load('provinces'), payload);
});
