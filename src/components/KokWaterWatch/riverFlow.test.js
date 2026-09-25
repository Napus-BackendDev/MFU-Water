import test from 'node:test';
import assert from 'node:assert/strict';
import { RIVER_BOUNDS, RIVER_COORDINATES, riverPointAt, RIVER_FLOW_CYCLE_DURATION_MS } from './riverFlow.js';

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
