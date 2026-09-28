import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { submissionReceipt } from './submissionReceipt.js';

const submitted = { sample_code: 'MOCK-NEW', publication_status: 'auto_published', revision: 1 };
function database(data, error = null) {
  const calls = [];
  const query = { select(value) { calls.push(['select', value]); return this; },
    eq(...args) { calls.push(['eq', ...args]); return this; },
    async maybeSingle() { return { data, error }; } };
  return { calls, service: { from(table) { calls.push(['from', table]); return query; } } };
}

test('duplicate receipt uses stored status and revision, not incoming low-PPB status', async () => {
  for (const status of ['pending_review', 'approved', 'withdrawn', 'rejected', 'auto_published']) {
    const db = database({ sample_code: 'MOCK-OLD', publication_status: status, revision: 4,
      collector: { name: 'must-not-leak' }, private_photo_paths: ['must-not-leak'] });
    const receipt = await submissionReceipt({ sample_code: 'MOCK-OLD', duplicate: true }, submitted, db.service);
    assert.deepEqual(receipt, { success: true, status, sample_code: 'MOCK-OLD', revision: 4 });
    assert.deepEqual(db.calls, [['from', 'kok_water_samples'], ['select', 'sample_code, publication_status, revision'],
      ['eq', 'sample_code', 'MOCK-OLD']]);
  }
});

test('new receipt retains API shape without extra reads or inventing an RPC code', async () => {
  const service = { from() { throw new Error('unexpected read'); } };
  assert.deepEqual(await submissionReceipt({ sample_code: 'MOCK-NEW', duplicate: false }, submitted, service),
    { success: true, status: 'auto_published', sample_code: 'MOCK-NEW', revision: 1 });
  for (const result of [null, {}, { sample_code: '' }, { sample_code: 'other' }, { sample_code: 'MOCK-NEW', duplicate: 'true' }]) {
    await assert.rejects(submissionReceipt(result, submitted, service), { status: 503 });
  }
});

test('duplicate missing, errored or malformed stored row fails closed without private error', async () => {
  for (const [data, error] of [[null, null], [null, { message: 'provider-secret' }],
    [{ sample_code: 'wrong', publication_status: 'approved', revision: 1 }, null],
    [{ sample_code: 'MOCK-OLD', publication_status: 'unknown', revision: 1 }, null],
    [{ sample_code: 'MOCK-OLD', publication_status: 'approved', revision: 0 }, null]]) {
    await assert.rejects(submissionReceipt({ sample_code: 'MOCK-OLD', duplicate: true }, submitted, database(data, error).service),
      error => error.status === 503 && !error.message.includes('provider-secret'));
  }
});

test('route obtains duplicate receipt after duplicate-only evidence cleanup', async () => {
  const source = await readFile(new URL('./waterWatchApi.js', import.meta.url), 'utf8');
  const start = source.indexOf("rpc('create_water_sample'");
  const end = source.indexOf("router.post('/contact-removal-requests'", start);
  const route = source.slice(start, end);
  assert.ok(route.indexOf('uploadedPaths.length = 0') < route.indexOf('await submissionReceipt'));
  assert.match(route, /res\.status\(data\?\.duplicate \? 200 : 201\)\.json\(receipt\)/);
  assert.match(source, /rpcDispatched = true;\s*const \{ data, error \} = await clients\.service\.rpc\('create_water_sample'/);
  assert.match(route, /if \(!rpcDispatched && uploadedPaths\.length\)/);
  assert.match(route, /if \(cleanupError\) throw cleanupError/);
});
