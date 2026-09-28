import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { RIVER_BOUNDS, RIVER_COORDINATES, RIVER_GEOMETRY, riverPointAt, RIVER_FLOW_CYCLE_DURATION_MS } from './riverFlow.js';

test('OSM channels preserve every source coordinate without connecting branches', () => {
  const raw = readFileSync(new URL('../../../public/kok-river-source.geojson', import.meta.url));
  const metadata = JSON.parse(readFileSync(new URL('../../../public/kok-river-source.json', import.meta.url)));
  assert.equal(createHash('sha256').update(raw).digest('hex'), metadata.rawSha256);
  assert.equal(metadata.license, 'ODbL-1.0');
  assert.deepEqual(RIVER_GEOMETRY, JSON.parse(raw));
  assert.deepEqual(RIVER_GEOMETRY.coordinates.map(part => part.length), [3363, 8, 6, 5, 5]);
  assert.equal(RIVER_COORDINATES, RIVER_GEOMETRY.coordinates[0]);
  assert.deepEqual(RIVER_COORDINATES[0], [99.525663, 20.860606]);
  assert.deepEqual(RIVER_COORDINATES.at(-1), [100.144093, 20.247616]);
});

test('blue river is not hidden under administrative overlays', () => {
  const mapSource = readFileSync(new URL('./WaterWatchMap.jsx', import.meta.url), 'utf8');
  assert.ok(mapSource.indexOf("map.moveLayer('kok-river-route-halo')") > mapSource.indexOf("id: 'bnd-locality-layer'"));
  assert.ok(mapSource.indexOf("map.moveLayer('kok-river-route-line')") > mapSource.indexOf("map.moveLayer('kok-river-route-halo')"));
  assert.match(mapSource, /'line-color': '#0EA5E9', 'line-opacity': 1/);
  assert.match(mapSource, /geometry: RIVER_GEOMETRY/);
  assert.doesNotMatch(mapSource, /kok-river-flow-arrow|riverFlowPlaying/);
  const viewSource = readFileSync(new URL('./KokWaterWatchView.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(viewSource, /ให้ลูกศรเคลื่อนที่|เล่นหรือหยุดลูกศรทิศทางน้ำ/);
});

test('river playback follows the recorded upstream-to-downstream path', () => {
  assert.deepEqual(riverPointAt(0), RIVER_COORDINATES[0]);
  assert.deepEqual(riverPointAt(1), RIVER_COORDINATES.at(-1));
  assert.deepEqual(riverPointAt(-1), RIVER_COORDINATES[0]);
  assert.deepEqual(riverPointAt(2), RIVER_COORDINATES.at(-1));
  const midpoint = riverPointAt(0.5);
  assert.ok(midpoint[0] >= RIVER_BOUNDS[0][0] && midpoint[0] <= RIVER_BOUNDS[1][0]);
  assert.ok(midpoint[1] >= RIVER_BOUNDS[0][1] && midpoint[1] <= RIVER_BOUNDS[1][1]);
  assert.ok(RIVER_BOUNDS[0][0] < 99.3 && RIVER_BOUNDS[1][0] > 100.1);
});

test('river flow cycle duration is calibrated for slow gentle flow', () => {
  assert.equal(typeof RIVER_FLOW_CYCLE_DURATION_MS, 'number');
  assert.ok(RIVER_FLOW_CYCLE_DURATION_MS >= 60000, 'cycle duration should be at least 60s for slow flow');
});
