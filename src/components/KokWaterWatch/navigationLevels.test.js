import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBoundaryLoader, loadAreaBoundaries } from './boundaryLoader.js';
import { THAI_REGIONS, filterSubmissionsByArea } from './mapAreaNavigation.js';
import { countPublishedByArea, filterSampleLevel } from './areaSampleCounts.js';
import { isWithinTimeRange } from './timeFilters.js';

const root = new URL('../../../public/data/boundaries/', import.meta.url);
const original = JSON.parse(readFileSync(new URL('thailand-provinces.geojson', root)));
test('region shards preserve all 77 canonical province features exactly', () => {
  const codes = new Set();
  for (const region of THAI_REGIONS) {
    const data = JSON.parse(readFileSync(new URL(`regions/${region.id}-provinces.geojson`, root)));
    assert.equal(data.features.length, region.provinceCodes.length);
    for (const feature of data.features) {
      assert.ok(!codes.has(feature.properties.shapeISO)); codes.add(feature.properties.shapeISO);
      assert.deepEqual(feature, original.features.find(f => f.properties.shapeISO === feature.properties.shapeISO));
    }
  }
  assert.equal(codes.size, 77);
  const regions = JSON.parse(readFileSync(new URL('thailand-regions.geojson', root)));
  assert.deepEqual(regions.features.map(f => f.properties.regionId).sort(), THAI_REGIONS.map(r => r.id).sort());
});

test('navigation loads ancestry in order and reuses cached requests', async () => {
  const calls = [];
  const loader = createBoundaryLoader(async url => {
    calls.push(url.replace(/\.gz$/, ''));
    return { ok: true, json: async () => ({ features: [{ properties: { shapeISO: 'TH-57', provinceCode: 'TH-57', districtCode: 'TH5701', nameTh: 'เมืองเชียงราย' } }] }) };
  });
  await loadAreaBoundaries({ level: 'country' }, loader);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(url => !url.includes('provinces') && !url.includes('districts')));
  await loadAreaBoundaries({ level: 'region', regionId: 'north' }, loader);
  assert.match(calls.at(-1), /regions\/north-provinces/);
  await loadAreaBoundaries({ level: 'district', regionId: 'north', provinceIso: 'TH-57' }, loader);
  assert.match(calls.at(-1), /districts\/TH-57/);
  const count = calls.length;
  await loadAreaBoundaries({ level: 'province', regionId: 'north', provinceIso: 'TH-57' }, loader);
  assert.equal(calls.length, count);
});

test('failed ancestors never trigger deeper requests and can retry', async () => {
  let failed = true; const calls = [];
  const loader = createBoundaryLoader(async url => { calls.push(url); return { ok: !failed, json: async () => ({ features: [] }) }; });
  await assert.rejects(loadAreaBoundaries({ level: 'district', regionId: 'north', provinceIso: 'TH-57' }, loader));
  assert.ok(calls.every(url => !url.includes('provinces') && !url.includes('districts')));
  failed = false;
  await loadAreaBoundaries({ level: 'country' }, loader);
  assert.equal(calls.length, 4);
});

test('counts are published entries, respect risk filter and disappear on withdrawal', () => {
  const square = { type: 'Polygon', coordinates: [[[0,0],[2,0],[2,2],[0,2],[0,0]]] };
  const boundaries = { regions: { features: [{ properties: { regionId: 'north' }, geometry: square }] } };
  const sample = { coordinates: [1,1], publication_status: 'auto_published', arsenic_ppb: 10 };
  const samples = [sample, { ...sample }, { ...sample, publication_status: 'pending_review' }, { ...sample, arsenic_ppb: 100 }];
  assert.equal(countPublishedByArea(samples, boundaries).north, 2);
  assert.equal(countPublishedByArea([], boundaries).north, 0);
  assert.equal(countPublishedByArea(filterSampleLevel(samples, 'critical'), boundaries).north, 0);
  assert.equal(countPublishedByArea([{ ...sample, publication_status: 'withdrawn' }], boundaries).north, 0);
  assert.deepEqual(countPublishedByArea(samples, {}), {});
  assert.deepEqual(filterSubmissionsByArea(samples, []), []);
});

test('global counts retain other areas, apply time and reject stale approval revisions', () => {
  const feature = (id, x) => ({ properties: { regionId: id }, geometry: { type: 'Polygon', coordinates: [[[x,0],[x+1,0],[x+1,1],[x,1],[x,0]]] } });
  const boundaries = { regions: { features: [feature('north', 0), feature('south', 2)] } };
  const sample = { coordinates: [.5,.5], publication_status: 'approved', revision: 2, approved_revision: 2, arsenic_ppb: 60, collection_time: '2024-10-01T12:00:00' };
  const samples = [sample, { ...sample, coordinates: [2.5,.5] }, { ...sample, approved_revision: 1 }, { ...sample, collection_time: '2024-09-01T12:00:00' }];
  const visible = filterSampleLevel(samples.filter(s => isWithinTimeRange(s.collection_time, 'custom', '2024-10-01', '2024-10-02')), 'critical');
  assert.deepEqual(countPublishedByArea(visible, boundaries), { north: 1, south: 1 });
  assert.equal(filterSubmissionsByArea(visible, [boundaries.regions.features[0]]).length, 2);
  const view = readFileSync(new URL('KokWaterWatchView.jsx', import.meta.url), 'utf8');
  assert.match(view, /resultCount=\{samplesLoaded && !samplesError \? levelFilteredSubmissions\.length : null\}/);
  assert.match(view, /samplesLoading=\{!samplesLoaded && !samplesError\}/);
  assert.match(view, /onRetrySamples=\{\(\) => pollingRef\.current\?\.refresh\(\)\}/);
});
