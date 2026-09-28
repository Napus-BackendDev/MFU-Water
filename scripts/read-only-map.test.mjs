import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createReadOnlyMapApp } from './serve-cloud-read.mjs';
import { publicPseudonym } from '../src/lib/publicPseudonym.js';

if (process.argv.includes('--ui-preview')) {
  const preview = createServer(createReadOnlyMapApp({ getPublicClients: mockPublicClients }));
  preview.listen(4181, '127.0.0.1');
  setTimeout(() => {
    preview.closeAllConnections();
    preview.close(() => process.exit(0));
  }, 120000).unref();
}

export function mockPublicClients() {
  const rows = Array.from({ length: 8 }, (_, i) => ({
    sample_code: `UI-TEST-${i + 1}`, station_id: `TEST-${i + 1}`,
    station_name: 'ข้อมูลจำลองทดสอบ UI', longitude: 99.8325 + i * 0.001,
    latitude: 19.904, collection_time: new Date().toISOString(),
    arsenic_ppb: i < 5 ? 30 : 200, publication_status: i < 5 ? 'auto_published' : 'pending_review',
    revision: 1, approved_revision: i < 5 ? 1 : null,
    private_photo_paths: [], sample_nature: {}, entry_type: 'sample',
    collector_name: 'PRIVATE_TEST_VALUE'
  }));
  return { service: { from() {
    let selected = rows;
    const query = {
      select() { return query; },
      in(key, values) { selected = selected.filter(row => values.includes(row[key])); return query; },
      eq(key, value) { selected = selected.filter(row => row[key] === value); return query; },
      order() { return Promise.resolve({ data: selected, error: null }); },
      maybeSingle() { return Promise.resolve({ data: selected[0] || null, error: null }); }
    };
    return query;
  } } };
}

test('read-only gateway returns only published DTOs, rejects writes/admin and protects local origin', async t => {
  const server = createServer(createReadOnlyMapApp({ getPublicClients: mockPublicClients }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${base}/api/samples`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const payload = await response.json();
  assert.equal(payload.data.length, 5);
  assert.ok(payload.data.every(row => row.contributor_label === publicPseudonym(row.sample_code)));
  assert.ok(!JSON.stringify(payload).includes('PRIVATE_TEST_VALUE'));
  assert.deepEqual(await (await fetch(`${base}/api/auth/session`)).json(), { user: null, readOnly: true });
  for (const [path, method] of [['samples', 'POST'], ['admin/samples', 'GET'], ['auth/login', 'POST'], ['auth/csrf', 'GET'], ['samples/UI-TEST-1', 'DELETE']]) {
    assert.equal((await fetch(`${base}/api/${path}`, { method })).status, 405);
  }
  assert.equal((await fetch(`${base}/api/samples/UI-TEST-6`)).status, 404);
  assert.equal((await fetch(`${base}/api/samples/UI-TEST-6/photos/0`)).status, 404);
  const csv = await (await fetch(`${base}/api/samples/export`)).text();
  assert.ok(csv.includes('UI-TEST-1') && !csv.includes('UI-TEST-6') && !csv.includes('PRIVATE_TEST_VALUE'));
  assert.equal((await fetch(`${base}/api/samples`, { headers: { Origin: 'https://other.example' } })).status, 403);
  assert.equal((await fetch(`${base}/api/samples`, { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
});
