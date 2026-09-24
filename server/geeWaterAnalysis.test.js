import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGeeAnalysisQuery } from './geeWaterAnalysis.js';

const basic = {
  mode: 'mndwi',
  bbox: '99.2,19.9,99.5,20.2',
  start: '2024-09-01',
  end: '2024-09-25',
  threshold: '0.15',
  cloud: '80'
};

test('GEE analysis query uses viewport bounds and inclusive end date', () => {
  const query = parseGeeAnalysisQuery(basic);
  assert.deepEqual(query.bbox, [99.2, 19.9, 99.5, 20.2]);
  assert.equal(query.period.endExclusive, '2024-09-26');
  assert.equal(query.threshold, 0.15);
  assert.equal(query.cloud, 80);
});

test('SAR change requires two valid periods', () => {
  const query = parseGeeAnalysisQuery({
    ...basic, mode: 's1-change', baselineStart: '2024-08-01', baselineEnd: '2024-08-31'
  });
  assert.equal(query.baseline.endExclusive, '2024-09-01');
  assert.equal(query.orbit, 'DESCENDING');
});

test('invalid or excessive requests are rejected before GEE calls', () => {
  for (const override of [
    { mode: 'unknown' },
    { bbox: '99,20,104,21' },
    { bbox: '99,20,98,21' },
    { end: '2024-09-31' },
    { start: '2024-10-01' },
    { threshold: '3' },
    { cloud: '101' }
  ]) {
    assert.throws(() => parseGeeAnalysisQuery({ ...basic, ...override }));
  }
});
