import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWaterWatchCSV, downloadWaterWatchCSV, WATER_WATCH_EXPORT_HEADERS } from './waterWatchExport.js';

test('CSV exports arsenic data without unused pH, turbidity, or temperature columns', () => {
  const csv = buildWaterWatchCSV([{
    sample_code: 'KOK-1',
    station_name: 'จุดตรวจ, "ริมแม่น้ำ"',
    coordinates: [0, 20],
    collection_time: '2026-09-24T08:00:00Z',
    collector: { name: 'ผู้เก็บ', organization: 'มฟล.' },
    sample_nature: { water_source: 'แม่น้ำกก', water_appearance: 'ใส' },
    measurements: {
      arsenic: { value: 10 },
      ph: { value: 7.4 },
      turbidity: { value: 1234 },
      temperature: { value: 37.5 }
    },
    images: [{ url: 'https://example.test/image?a=1,b=2' }]
  }]);

  assert.equal(WATER_WATCH_EXPORT_HEADERS.length, 12);
  assert.equal(csv.charCodeAt(0), 0xFEFF);
  assert.equal(csv.split('\n').length, 2);
  assert.match(csv, /"จุดตรวจ, ""ริมแม่น้ำ"""/);
  assert.match(csv, /"20","0"/);
  assert.match(csv, /"10","1","https:\/\/example\.test\/image\?a=1,b=2"/);
  for (const unused of ['ค่า_pH', 'ความขุ่น_NTU', 'อุณหภูมิ_C', '"7.4"', '"1234"', '"37.5"']) {
    assert.equal(csv.includes(unused), false, unused);
  }
});

test('download action creates a UTF-8 CSV blob and requests the expected filename', async () => {
  const events = [];
  let exportedBlob;
  const link = {
    remove: () => events.push('remove'),
    click: () => events.push('click')
  };
  const filename = downloadWaterWatchCSV([{
    sample_code: 'KOK-1',
    coordinates: [99.8913, 20.0462],
    measurements: { arsenic: { value: 30 } }
  }], 'today', {
    documentRef: {
      createElement: (tag) => {
        assert.equal(tag, 'a');
        return link;
      },
      body: { appendChild: () => events.push('append') }
    },
    urlApi: {
      createObjectURL: (blob) => {
        exportedBlob = blob;
        return 'blob:test';
      },
      revokeObjectURL: (url) => events.push(`revoke:${url}`)
    },
    schedule: (callback, delay) => {
      assert.equal(delay, 1000);
      callback();
    },
    date: new Date('2026-09-25T12:00:00Z')
  });

  assert.equal(filename, 'KOK_Water_Watch_today_2026-09-25.csv');
  assert.equal(link.href, 'blob:test');
  assert.equal(link.download, filename);
  assert.deepEqual(events, ['append', 'click', 'remove', 'revoke:blob:test']);
  assert.equal(exportedBlob.type, 'text/csv;charset=utf-8;');
  const csv = await exportedBlob.text();
  assert.equal(csv.split('\n').length, 2);
  assert.match(csv, /"20\.0462","99\.8913"/);
  assert.match(csv, /"30","0",""$/);
});

test('download filename uses local calendar date, not UTC date', () => {
  let filename;
  downloadWaterWatchCSV([], 'all', {
    documentRef: {
      createElement: () => ({
        remove: () => {},
        click() { filename = this.download; }
      }),
      body: { appendChild: () => {} }
    },
    urlApi: { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} },
    schedule: () => {},
    date: {
      getFullYear: () => 2026,
      getMonth: () => 8,
      getDate: () => 25,
      toISOString: () => '2026-09-24T22:12:00.000Z'
    }
  });
  assert.equal(filename, 'KOK_Water_Watch_all_2026-09-25.csv');
});
