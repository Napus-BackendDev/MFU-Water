import test from 'node:test';
import assert from 'node:assert/strict';
import { getArsenicPpb, summarizeWaterWatch } from './waterWatchSummary.js';

test('daily summary uses Bangkok dates and does not mark missing measurements as normal', () => {
  const now = Date.parse('2026-09-25T12:00:00+07:00');
  const summary = summarizeWaterWatch([
    { collection_time: '2026-09-24T23:30:00Z', measurements: { arsenic: { value: 12 } } },
    { collection_time: '2026-09-25T10:00:00+07:00', arsenic_ppb: 7 },
    { collection_time: '2026-09-24T10:00:00+07:00', measurements: { arsenic: { value: 2 } } },
    { collection_time: '2026-09-24T11:00:00+07:00', measurements: { arsenic: { value: '' } } },
    { collection_time: 'invalid', arsenic_ppb: 8 },
    { collection_time: '2026-09-26T10:00:00+07:00', arsenic_ppb: 5 }
  ], now);

  assert.equal(summary.overall.total, 6);
  assert.equal(summary.overall.normal, 1);
  assert.equal(summary.overall.watch, 3);
  assert.equal(summary.overall.critical, 1);
  assert.equal(summary.overall.unknown, 1);
  assert.equal(summary.undated, 1);
  assert.deepEqual(summary.daily.map(({ day }) => day), ['2026-09-26', '2026-09-25', '2026-09-24']);
  assert.equal(summary.daily[1].critical, 1);
  assert.deepEqual(summary.monthly.map(({ month }) => month), ['2026-09']);
  assert.equal(summary.monthly[0].total, 5);
  assert.equal(summary.monthly[0].unknown, 1);
  assert.equal(summary.recent.total, 2);
  assert.equal(summary.recent.critical, 1);
});

test('empty and invalid values remain unclassified', () => {
  assert.equal(getArsenicPpb({ arsenic_ppb: '' }), null);
  assert.equal(getArsenicPpb({ arsenic_ppb: -1 }), null);
  assert.equal(getArsenicPpb({ arsenic_ppb: 'NaN' }), null);
  assert.equal(getArsenicPpb({ arsenic_ppb: '0' }), 0);
  const summary = summarizeWaterWatch([], Date.now());
  assert.equal(summary.overall.total, 0);
  assert.equal(summary.overall.average, null);
  assert.deepEqual(summary.daily, []);
  assert.deepEqual(summary.monthly, []);
});

test('monthly summary groups by Bangkok calendar month and averages measured values only', () => {
  const summary = summarizeWaterWatch([
    { collection_time: '2026-08-31T16:30:00Z', arsenic_ppb: 2 },
    { collection_time: '2026-08-31T17:30:00Z', arsenic_ppb: 12 },
    { collection_time: '2026-09-02T10:00:00+07:00', arsenic_ppb: 8 },
    { collection_time: '2026-09-02T11:00:00+07:00', arsenic_ppb: '' }
  ]);

  assert.deepEqual(summary.monthly.map(({ month }) => month), ['2026-09', '2026-08']);
  assert.deepEqual(
    [summary.monthly[0].total, summary.monthly[0].critical, summary.monthly[0].watch, summary.monthly[0].unknown],
    [3, 1, 1, 1]
  );
  assert.equal(summary.monthly[0].average, 10);
  assert.equal(summary.monthly[1].normal, 1);
  assert.equal(summary.monthly.reduce((total, month) => total + month.total, 0), 4);
});
