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
