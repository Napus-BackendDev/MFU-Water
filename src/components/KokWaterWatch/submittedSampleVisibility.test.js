import test from 'node:test';
import assert from 'node:assert/strict';
import { submittedSampleVisibility } from './submittedSampleVisibility.js';
import { startPublishedPolling } from '../../lib/publishedPolling.js';

const feature = { properties: { regionId: 'north' }, geometry: { type: 'Polygon', coordinates: [[[99,19],[101,19],[101,21],[99,21],[99,19]]] } };
const regions = { features: [feature] };
const saved = { sample_code: 'TEST-1', publication_status: 'auto_published' };
const rows = [{ ...saved, coordinates: [100,20], arsenic_ppb: 50 }];

test('confirmed public sample opens its region from overview or another area', () => {
  for (const area of [{ level: 'country' }, { level: 'region', regionId: 'south' }]) {
    const result = submittedSampleVisibility(saved, rows, area, null, regions);
    assert.deepEqual(result.selection, { level: 'region', countryIso: 'THA', regionId: 'north' });
    assert.equal(result.resetFilters, true);
  }
  const result = submittedSampleVisibility(saved, rows, { level: 'province' }, feature, regions);
  assert.equal(result.selection, null, 'retain selected detail when sample is already inside');
  assert.equal(result.resetFilters, true);
});

test('pending, failed refresh and absent public record never claim map visibility', () => {
  const pending = submittedSampleVisibility({ ...saved, publication_status: 'pending_review' }, [], { level: 'country' }, null, regions);
  assert.match(pending.message, /รอผู้ดูแลอนุมัติ/);
  assert.equal(pending.selection, undefined);
  for (const publicRows of [null, undefined, []]) {
    const result = submittedSampleVisibility(saved, publicRows, { level: 'country' }, null, regions);
    assert.match(result.message, /ยังตรวจยืนยัน/);
    assert.equal(result.resetFilters, undefined);
  }
});

test('post-save refresh awaits queued fresh response, never pre-save polling data', async () => {
  const visibility = new EventTarget(); visibility.hidden = false;
  const pending = [];
  const poller = startPublishedPolling({ visibility, load: () => new Promise(resolve => pending.push(resolve)), onData: () => {}, onError: assert.fail, schedule: () => 1, cancel: () => {} });
  try {
    await new Promise(resolve => setImmediate(resolve));
    const refreshed = poller.refresh();
    pending.shift()([]);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(pending.length, 1, 'follow-up request remains serialized');
    pending.shift()(rows);
    assert.deepEqual(await refreshed, rows);
  } finally { poller.stop(); }
});
