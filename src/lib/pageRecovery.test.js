import test from 'node:test';
import assert from 'node:assert/strict';
import { routeFromHash, recoveryUrl, recoverStaleChunk } from './pageRecovery.js';

test('retry query precedes hash, preserves search and removes only malformed retry suffixes', () => {
  const url = new URL(recoveryUrl('http://localhost:4174/?keep=yes#admin?r=1790624409891?r=1790624410379', 123));
  assert.equal(url.hash, '#admin');
  assert.equal(url.searchParams.get('keep'), 'yes');
  assert.equal(url.searchParams.get('_app_reload'), '123');
  assert.equal(recoveryUrl('http://localhost/#login?type=invite', 123), 'http://localhost/?_app_reload=123#login?type=invite');
  assert.equal(routeFromHash('#admin?r=123'), 'admin');
  assert.equal(routeFromHash('#login'), 'admin');
  assert.equal(routeFromHash('#sentinel-compare?reset=456'), 'analysis');
});

test('chunk recovery retries once, never clears storage, and leaves non-chunk errors alone', () => {
  const values = new Map([['other-session-setting', 'keep']]);
  const replaced = [];
  const browser = { sessionStorage: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) }, location: { href: 'http://localhost/#admin', replace: url => replaced.push(url) } };
  const error = new TypeError('Failed to fetch dynamically imported module: /assets/old.js');
  assert.equal(recoverStaleChunk(error, browser, 100000), true);
  assert.equal(recoverStaleChunk(error, browser, 100001), false);
  assert.equal(recoverStaleChunk(new Error('Login failed'), browser, 140000), false);
  assert.equal(replaced.length, 1);
  assert.equal(values.get('other-session-setting'), 'keep');
});

test('blocked session storage does not cause an automatic reload loop', () => {
  const browser = { sessionStorage: { getItem() { throw Error('blocked'); } }, location: { href: 'http://localhost/?_app_reload=100000#admin', replace() { assert.fail('must not reload'); } } };
  assert.equal(recoverStaleChunk(new Error('Importing a module script failed'), browser, 100001), false);
});
