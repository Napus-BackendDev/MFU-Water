import test from 'node:test';
import assert from 'node:assert/strict';
import { parseThaTonPeriod, validateThaTonPair } from './geeThaTonTimeline.js';

test('default Tha Ton timeline covers one calendar month and includes the final day', () => {
  assert.deepEqual(parseThaTonPeriod(), {
    start: '2024-09-05', end: '2024-10-05', endExclusive: '2024-10-06'
  });
});

test('timeline rejects invalid or excessive ranges before Earth Engine calls', () => {
  for (const query of [
    { start: '2024-09-31', end: '2024-10-05' },
    { start: '2024-10-06', end: '2024-10-05' },
    { start: '2024-08-01', end: '2024-10-05' },
    { start: '2023-09-05', end: '2023-10-05' }
  ]) assert.throws(() => parseThaTonPeriod(query));
});

test('Before–After requires ordered images from the same orbit and direction', () => {
  const frames = [
    { relativeOrbit: 33, orbitPass: 'DESCENDING' },
    { relativeOrbit: 44, orbitPass: 'ASCENDING' },
    { relativeOrbit: 33, orbitPass: 'DESCENDING' }
  ];
  assert.deepEqual(validateThaTonPair(frames, 0, 2), { before: frames[0], after: frames[2] });
  assert.throws(() => validateThaTonPair(frames, 0, 1), /วงโคจร/);
  assert.throws(() => validateThaTonPair(frames, 2, 0), /ลำดับเวลา/);
  assert.throws(() => validateThaTonPair(frames, -1, 2), /ลำดับเวลา/);
});
