import test from 'node:test';
import assert from 'node:assert/strict';
import { getAdminSession, isAdminAuthenticated } from './adminAuth.js';

test('admin authorization never trusts browser storage or a forged local session', () => {
  const originalWindow = globalThis.window;
  const store = new Map([['kok_admin_session', JSON.stringify({ user: { role: 'admin' }, token: 'forged' })]]);
  globalThis.window = { localStorage: { getItem: key => store.get(key) || null } };
  try {
    assert.equal(getAdminSession(), null);
    assert.equal(isAdminAuthenticated(), false);
  } finally {
    globalThis.window = originalWindow;
  }
});
