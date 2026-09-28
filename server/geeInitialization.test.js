import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGeeCredential, initializeGee } from './geeInitialization.js';
// Deliberately unusable fixture: no real credential, file or Google access.
const fixture = { type: 'service_account', project_id: 'fixture-project', client_email: 'fixture@example.invalid', private_key: 'not-a-key' };
test('Vercel credentials are explicit and validated, never fall back to local files', () => {
  const env = { VERCEL: '1', NODE_ENV: 'production' };
  const readLocal = () => { throw new Error('local credential access forbidden'); };
  assert.equal(loadGeeCredential({ env, readLocal }), null);
  assert.equal(loadGeeCredential({ env: { ...env, GEE_SERVICE_ACCOUNT_JSON: '{broken' }, readLocal }), null);
  for (const raw of ['null', '[]', '123', '"text"']) {
    assert.equal(loadGeeCredential({ env: { ...env, GEE_SERVICE_ACCOUNT_JSON: raw }, readLocal }), null);
  }
  for (const field of ['type', 'project_id', 'client_email', 'private_key']) {
    assert.equal(loadGeeCredential({ env: { ...env, GEE_SERVICE_ACCOUNT_JSON: JSON.stringify({ ...fixture, [field]: '' }) }, readLocal }), null);
  }
  const raw = JSON.stringify({ ...fixture, token_uri: 'https://untrusted.invalid', unexpected: 'ignored' });
  assert.equal(loadGeeCredential({ env: { ...env, GEE_SERVICE_ACCOUNT_JSON: raw }, readLocal }), null, 'unusable key is rejected before SDK');
  assert.deepEqual(loadGeeCredential({ env: { ...env, GEE_SERVICE_ACCOUNT_JSON: raw }, readLocal, validateKey: () => true }), fixture);
  assert.equal(loadGeeCredential({ env: { ...env, NODE_ENV: 'development', GEE_SERVICE_ACCOUNT_JSON: raw }, readLocal }), null);
});
test('duplicate auth callbacks initialize once and warm callers share settled result', async () => {
  let success;
  let failure;
  let initialized = 0;
  let complete;
  const ee = { data: { authenticateViaPrivateKey(key, ok, fail) { success = ok; failure = fail; } },
    initialize(base, tile, ok) { initialized++; complete = ok; } };
  const pending = initializeGee(ee, fixture);
  success(); success(); failure(null);
  assert.equal(initialized, 1);
  complete(); complete();
  const [a, b] = await Promise.all([pending, pending]);
  assert.strictEqual(a, b);
  assert.equal(a.ready, true);
  assert.deepEqual(await initializeGee({ data: { authenticateViaPrivateKey(key, ok) { ok(); } },
    initialize() { throw new Error('private-provider-detail'); } }, fixture), { ready: false, clientEmail: '' });
});
test('standalone retains local source; missing and malformed keys fail closed', () => {
  assert.deepEqual(loadGeeCredential({ env: {}, readLocal: () => JSON.stringify(fixture), validateKey: () => true }), fixture);
  assert.equal(loadGeeCredential({ env: {}, readLocal: () => { throw new Error('private-filesystem-detail'); } }), null);
  assert.equal(loadGeeCredential({ env: {}, readLocal: () => null }), null);
  assert.equal(loadGeeCredential({ env: {}, readLocal: () => '{invalid' }), null);
});
test('GEE initialization passes project and publishes readiness only on success', async () => {
  let calls = 0;
  const ee = { data: { authenticateViaPrivateKey(key, success) { assert.deepEqual(key, fixture); calls++; success(); } },
    initialize(base, tile, success, failure, xsrf, project) { assert.equal(project, fixture.project_id); success(); } };
  assert.deepEqual(await initializeGee(ee, fixture), { ready: true, clientEmail: fixture.client_email });
  assert.deepEqual(await initializeGee(ee, null), { ready: false, clientEmail: '' });
  assert.equal(calls, 1);
});
test('errors and late callbacks cannot publish readiness or private provider details', async () => {
  const unavailable = { ready: false, clientEmail: '' };
  for (const stage of ['auth', 'initialize']) {
    const ee = { data: { authenticateViaPrivateKey(key, success, fail) { if (stage === 'auth') fail(new Error('private-provider-detail')); else success(); } },
      initialize(base, tile, success, fail) { fail(new Error('private-provider-detail')); } };
    assert.deepEqual(await initializeGee(ee, fixture), unavailable);
  }
  assert.deepEqual(await initializeGee({ data: { authenticateViaPrivateKey() { throw new Error('private-provider-detail'); } } }, fixture), unavailable);
  let authSuccess;
  let calls = 0;
  const ee = { data: { authenticateViaPrivateKey(key, success) { authSuccess = success; } }, initialize() { calls++; } };
  assert.deepEqual(await initializeGee(ee, fixture, { timeoutMs: 5 }), unavailable);
  authSuccess();
  assert.equal(calls, 0);
  let lateSuccess;
  const late = { data: { authenticateViaPrivateKey(key, success) { success(); } }, initialize(base, tile, success) { lateSuccess = success; } };
  const result = await initializeGee(late, fixture, { timeoutMs: 5 });
  lateSuccess();
  assert.deepEqual(result, unavailable);
});
