import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarDays, compatibleAfterFrames, latestSceneIndexForDay, selectDefaultPair } from './thaTonTimeline.js';

const frames = [
  { acquiredAt: '2024-09-06T00:00:00Z', orbitPass: 'DESCENDING', relativeOrbit: 33 },
  { acquiredAt: '2024-09-09T00:00:00Z', orbitPass: 'ASCENDING', relativeOrbit: 44 },
  { acquiredAt: '2024-09-18T00:00:00Z', orbitPass: 'DESCENDING', relativeOrbit: 33 },
  { acquiredAt: '2024-09-21T00:00:00Z', orbitPass: 'ASCENDING', relativeOrbit: 44 }
];

test('compatible after frames must match pass and relative orbit', () => {
  assert.deepEqual(compatibleAfterFrames(frames, 0), [frames[2]]);
});

test('default comparison straddles flood event or reports no valid baseline', () => {
  assert.deepEqual(selectDefaultPair(frames), { beforeIndex: 1, afterIndex: 3 });
  assert.equal(selectDefaultPair(frames.slice(2)), null);
});

test('calendar playback includes every date in the selected period', () => {
  assert.deepEqual(calendarDays('2024-09-05', '2024-09-08'), [
    '2024-09-05', '2024-09-06', '2024-09-07', '2024-09-08'
  ]);
  assert.equal(calendarDays('2024-09-05', '2024-10-05').length, 31);
  assert.deepEqual(calendarDays('2024-10-05', '2024-09-05'), []);
});

test('days without a new acquisition keep latest real scene, never a future scene', () => {
  assert.equal(latestSceneIndexForDay(frames, '2024-09-05'), -1);
  assert.equal(latestSceneIndexForDay(frames, '2024-09-06'), 0);
  assert.equal(latestSceneIndexForDay(frames, '2024-09-08'), 0);
  assert.equal(latestSceneIndexForDay(frames, '2024-09-18'), 2);
  assert.equal(latestSceneIndexForDay(frames, '2024-10-05'), 3);
  assert.equal(latestSceneIndexForDay([], '2024-09-18'), -1);
});
