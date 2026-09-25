import test from 'node:test';
import assert from 'node:assert/strict';
import { compatibleAfterFrames, selectDefaultPair } from './thaTonTimeline.js';

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
