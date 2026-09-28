import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as api from './supabase.js';

test('admin failures never fall back to database/auth SDK or an email exemption', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  for (const status of [401, 403, 429, 503]) {
    const calls = [];
    globalThis.fetch = async path => {
      calls.push(path);
      assert.ok(path.startsWith('/api/'));
      if (path === '/api/security/csrf') return Response.json({ csrfToken: 'mock-csrf' });
      return Response.json({ error: 'denied' }, { status });
    };
    await assert.rejects(api.loginAdmin({ email: 'test@example.invalid', password: 'fixture' }), /denied/);
    await assert.rejects(api.reviewAdminSample('TEST', { decision: 'approve', revision: 1, reason: 'fixture' }), /denied/);
    await assert.rejects(api.inviteAdmin('test@example.invalid'), /denied/);
    await assert.rejects(api.deactivateAdmin('TEST'), /denied/);
    await assert.rejects(api.fetchAdminContact('TEST'), /denied/);
    await assert.rejects(api.logoutAdminSession(), /denied/);
    assert.equal(await api.checkAdminSession(), null);
    assert.ok(calls.length > 0);
  }
  assert.equal(api.getSupabaseClient(), null);
  const source = readFileSync(new URL('./supabase.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /createClient|signInWithPassword|\.from\(|admin@mfu|persistSession/);
});

test('expired CSRF is cleared after 403; retry fetches a fresh token without auto-replaying mutation', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  let tokens = 0;
  let mutations = 0;
  globalThis.fetch = async path => {
    if (path === '/api/security/csrf') { tokens++; return Response.json({ csrfToken: 'mock-csrf' }); }
    mutations++;
    return mutations === 1 ? Response.json({ error: 'expired' }, { status: 403 }) : Response.json({ success: true });
  };
  await assert.rejects(api.logoutAdminSession(), /expired/);
  assert.equal(mutations, 1);
  const before = tokens;
  await api.logoutAdminSession();
  assert.equal(tokens, before + 1);
  assert.equal(mutations, 2);
});
