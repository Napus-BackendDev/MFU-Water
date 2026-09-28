import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

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
    return Response.json({ success: true, sample_code: 'TEST-1', status: 'pending_review', revision: 1 });
  };
  const { saveSampleToSupabase } = await import('./supabase.js');
  const record = { arsenic_ppb: 200, coordinates: [99.8, 20] };
  const photos = [new Blob(['test evidence'], { type: 'image/jpeg' })];
  await assert.rejects(saveSampleToSupabase(record, photos, 'same-attempt-123456'), /ระบบบันทึกไม่พร้อมใช้งาน/);
  assert.equal(calls.filter(c => c.path === '/api/samples').length, 1);
  fail = false;
  const result = await saveSampleToSupabase(record, photos, 'same-attempt-123456');
  assert.equal(result.data.status, 'pending_review');
  for (const { options } of calls.filter(c => c.path === '/api/samples')) {
    assert.equal(options.headers['Idempotency-Key'], 'same-attempt-123456');
    assert.equal(options.cache, 'no-store');
    assert.deepEqual(JSON.parse(options.body.get('sample')), record);
    assert.equal(options.body.getAll('photos').length, 1);
    assert.equal(options.body.get('photos').name, 'evidence.jpg');
  }
  globalThis.fetch = async () => { throw new Error('network unavailable'); };
  await assert.rejects(saveSampleToSupabase(record, photos, 'same-attempt-123456'), /network unavailable/);
});

test('HTTP success without a valid submission receipt remains retryable', async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const { saveSampleToSupabase } = await import('./supabase.js');
  const valid = { success: true, sample_code: 'TEST-RECEIPT', status: 'approved', revision: 2 };
  for (const receipt of [{}, { ...valid, success: false }, { ...valid, sample_code: ' ' },
    { ...valid, status: 'unknown' }, { ...valid, revision: 0 }, { ...valid, revision: '2' }]) {
    globalThis.fetch = async path => Response.json(path === '/api/security/csrf' ? { csrfToken: 'mock-csrf' } : receipt);
    await assert.rejects(saveSampleToSupabase({}, [], 'same-receipt-attempt'), /ยังยืนยันผลการบันทึกไม่ได้/);
  }
  globalThis.fetch = async path => Response.json(path === '/api/security/csrf' ? { csrfToken: 'mock-csrf' } : valid);
  assert.deepEqual((await saveSampleToSupabase({}, [], 'same-receipt-attempt')).data, valid);
});

test('form wiring keeps compressed evidence and record on retry, locks mutation, avoids FileReader races', async () => {
  const source = await readFile(new URL('../components/KokWaterWatch/WaterWatchForm.jsx', import.meta.url), 'utf8');
  assert.match(source, /if \(!pendingAttempt\.current\)/);
  assert.match(source, /saveSampleToSupabase\(attempt\.record, attempt\.evidence, attempt\.key\)/);
  assert.match(source, /onSubmitSuccess\(\{ \.\.\.attempt\.record/);
  assert.match(source, /const formLocked = isSubmitting \|\| retryPending/);
  assert.match(source, /const removePhoto = \(slot\) => \{\s*if \(submitting\.current \|\| pendingAttempt\.current\) return/);
  assert.match(source, /if \(submitting\.current\) return/);
  assert.match(source, /URL\.revokeObjectURL/);
  assert.doesNotMatch(source, /new FileReader/);
});

test('pending attempt keeps the form mounted when hidden and releases it after receipt', async () => {
  const form = await readFile(new URL('../components/KokWaterWatch/WaterWatchForm.jsx', import.meta.url), 'utf8');
  const view = await readFile(new URL('../components/KokWaterWatch/KokWaterWatchView.jsx', import.meta.url), 'utf8');
  assert.match(view, /isFormOpen \|\| hasPendingForm/);
  assert.match(view, /display: isFormOpen \? undefined : 'none'/);
  assert.match(view, /aria-hidden=\{!isFormOpen\}/);
  assert.match(view, /onPendingAttemptChange=\{setHasPendingForm\}/);
  const frozen = form.indexOf('pendingAttempt.current = { record: newRecord');
  const retained = form.indexOf('onPendingAttemptChange?.(true)', frozen);
  const dispatched = form.indexOf('await saveSampleToSupabase', frozen);
  const confirmed = form.indexOf('pendingAttempt.current = null', dispatched);
  const released = form.indexOf('onPendingAttemptChange?.(false)', confirmed);
  assert.ok(frozen >= 0 && retained > frozen && dispatched > retained);
  assert.ok(confirmed > dispatched && released > confirmed);
  assert.doesNotMatch(form, /(?:localStorage|sessionStorage)\.setItem/);
});
