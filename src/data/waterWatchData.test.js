import test from 'node:test';
import assert from 'node:assert/strict';
import { clusterSubmissions, normalizeSubmission, parseCoordinate } from './waterWatchData.js';

test('coordinates require complete decimal values', () => {
  assert.equal(parseCoordinate(' 20.0462 '), 20.0462);
  assert.equal(parseCoordinate('-0.5'), -0.5);
  for (const input of ['', ' ', '20abc', '99.8oops', '0x20', '1e2']) {
    assert.ok(Number.isNaN(parseCoordinate(input)), input);
  }
});

test('map risk thresholds match the displayed <5, 5-10, >10 ppb legend', () => {
  for (const [value, status] of [
    [0, 'normal'],
    [5, 'watch'],
    [10, 'watch'],
    [30, 'danger']
  ]) {
    const sample = {
      sample_code: `KOK-${value}`,
      coordinates: [99.38, 20.05],
      collection_time: '2026-09-24T08:00:00+07:00',
      measurements: { arsenic: { value } }
    };
    const point = clusterSubmissions([sample]).singlePoints[0];
    assert.equal(point.isDanger, status === 'danger', `${value} ppb danger`);
    assert.equal(point.isWatch, status === 'watch', `${value} ppb watch`);
    assert.equal(point.isSafe, status === 'normal', `${value} ppb normal`);
    assert.equal(normalizeSubmission(sample).measurements.arsenic.status, status);
  }
});

test('hotspot marker stays on the newest real sample coordinate, not a synthetic centroid', () => {
  const older = { record_id: 'older', coordinates: [99.8, 19.9], collection_time: '2026-09-23T08:00:00+07:00' };
  const latest = { record_id: 'latest', coordinates: [99.801, 19.901], collection_time: '2026-09-24T08:00:00+07:00' };
  const hotspot = clusterSubmissions([older, latest], 250).clusters[0];
  assert.deepEqual(hotspot.coordinates, latest.coordinates);
});

test('hotspot clustering never merges samples assigned to different provinces', () => {
  const samples = [
    { record_id: 'chiang-rai', provinceIso: 'TH-57', coordinates: [99.8, 19.9] },
    { record_id: 'chiang-mai', provinceIso: 'TH-50', coordinates: [99.801, 19.901] }
  ];
  const result = clusterSubmissions(samples, 250, sample => sample.provinceIso);
  assert.equal(result.clusters.length, 0);
  assert.equal(result.singlePoints.length, 2);
});
