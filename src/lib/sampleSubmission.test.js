import test from 'node:test';
import assert from 'node:assert/strict';

test('sample submission uses Express only, retains evidence and idempotency on retry', async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const calls = [];
  let fail = true;
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options });
    assert.ok(path.startsWith('/api/'), 'must never contact Supabase directly');
    if (path === '/api/security/csrf') return Response.json({ csrfToken: 'mock-csrf' });
    if (fail) return Response.json({ error: 'ระบบบันทึกไม่พร้อมใช้งาน' }, { status: 503 });
    return Response.json({ sample_code: 'TEST-1', status: 'pending_review' });
  };
  const { saveSampleToSupabase } = await import('./supabase.js');
  const record = { arsenic_ppb: 200, coordinates: [99.8, 20] };
  const photos = [new Blob(['test evidence'], { type: 'image/jpeg' })];
  await assert.rejects(saveSampleToSupabase(record, photos, 'same-attempt'), /ระบบบันทึกไม่พร้อมใช้งาน/);
  assert.equal(calls.filter(c => c.path === '/api/samples').length, 1);
  fail = false;
  const result = await saveSampleToSupabase(record, photos, 'same-attempt');
  assert.equal(result.data.status, 'pending_review');
  for (const { options } of calls.filter(c => c.path === '/api/samples')) {
    assert.equal(options.headers['Idempotency-Key'], 'same-attempt');
    assert.equal(options.cache, 'no-store');
    assert.deepEqual(JSON.parse(options.body.get('sample')), record);
    assert.equal(options.body.getAll('photos').length, 1);
    assert.equal(options.body.get('photos').name, 'evidence.jpg');
  }
  globalThis.fetch = async () => { throw new Error('network unavailable'); };
  await assert.rejects(saveSampleToSupabase(record, photos, 'same-attempt'), /network unavailable/);
});
