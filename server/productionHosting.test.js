import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'node:http';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { configureHttp, mountWeb, validateProductionConfig, parseTrustProxy } from './productionHosting.js';
const dist = resolve(import.meta.dirname, '../dist');

test('same-origin hosting serves HTML/assets but never HTML for API or missing chunks', async t => {
  const app = express();
  configureHttp(app);
  app.use('/api', (req, res) => res.status(404).set('Cache-Control', 'no-store').json({ error: 'not_found' }));
  mountWeb(app, dist);
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const page = await fetch(origin);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  assert.equal(page.headers.get('cache-control'), 'no-store');
  assert.equal(page.headers.get('x-powered-by'), null);
  assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
  const api = await fetch(origin + '/api/missing');
  assert.equal(api.status, 404);
  assert.equal((await api.json()).error, 'not_found');
  const missing = await fetch(origin + '/assets/missing.js');
  assert.equal(missing.status, 404);
  assert.doesNotMatch(await missing.text(), /<!doctype/i);
  const asset = readdirSync(resolve(dist, 'assets')).find(file => /^index-.*\.js$/.test(file));
  const js = await fetch(origin + '/assets/' + asset);
  assert.match(js.headers.get('content-type'), /javascript/);
  assert.match(js.headers.get('cache-control'), /immutable/);
  const worker = readdirSync(resolve(dist, 'assets')).find(file => /^maplibre-gl-worker-.*\.js$/.test(file));
  assert.ok(worker, 'MapLibre worker must be packaged locally rather than a broken relative import');
  const workerResponse = await fetch(origin + '/assets/' + worker);
  assert.equal(workerResponse.status, 200);
  assert.match(workerResponse.headers.get('content-type'), /javascript/);
  const health = await fetch(origin + '/healthz');
  assert.equal((await health.json()).database, 'not_checked');
});
test('production config fails closed without secrets/build/HTTPS and blocks incomplete invites', () => {
  assert.throws(() => validateProductionConfig({ NODE_ENV: 'production' }, dist), /production_config_missing/);
  const fixture = { NODE_ENV: 'production', SUPABASE_URL: 'https://example.invalid', PUBLIC_APP_URL: 'https://app.invalid', SUPABASE_ANON_KEY: 'test-only', SUPABASE_SERVICE_ROLE_KEY: 'test-only', ADMIN_CSRF_SECRET: 'x'.repeat(32) };
  assert.doesNotThrow(() => validateProductionConfig(fixture, dist));
  assert.throws(() => validateProductionConfig({ ...fixture, PUBLIC_APP_URL: 'http://app.invalid' }, dist), /https/);
  assert.throws(() => validateProductionConfig({ ...fixture, ENABLE_ADMIN_INVITES: 'true' }, dist), /invites/);
  assert.throws(() => validateProductionConfig(fixture, resolve(dist, 'missing-build')), /build_required/);
});

test('proxy trust accepts only explicit bounded IP/CIDR addresses', () => {
  for (const value of [undefined, false, '', ' ', 'false', ' false ']) assert.equal(parseTrustProxy(value), false);
  assert.deepEqual(parseTrustProxy(' 127.0.0.1, ::1,10.20.0.0/16 '), ['127.0.0.1', '::1', '10.20.0.0/16']);
  for (const value of [true, 1, [], () => true, 'true', '1', '0', 'loopback', 'uniquelocal', 'proxy.invalid',
    '127.0.0.1,', ',::1', '999.1.1.1', '10.0.0.0/33', '::1/129', '10.0.0.0/-1',
    '10.0.0.0/1.5', '10.0.0.0/255.255.255.0', '0.0.0.0/0', '::/0',
    '0.0.0.0/1,128.0.0.0/1', '::/1,8000::/1', '::ffff:0.0.0.0/96',
    '0:0:0:0:0:ffff:0:0/96', '0000:0000:0000:0000:0000:ffff:0000:0000/96', 'fe80::1%eth0']) {
    assert.throws(() => parseTrustProxy(value), /^Error: invalid_trust_proxy$/);
  }
});

test('untrusted forwarded headers cannot change client IP or HTTPS; explicit local proxy can', async t => {
  for (const trusted of [false, true]) {
    const app = express();
    configureHttp(app, { trustProxy: trusted ? '127.0.0.1' : '192.0.2.10' });
    app.get('/', (req, res) => res.json({ ip: req.ip, secure: req.secure }));
    const server = createServer(app);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const response = await fetch(`http://127.0.0.1:${server.address().port}`, {
      headers: { 'X-Forwarded-For': '192.0.2.99, 198.51.100.7', 'X-Forwarded-Proto': 'https' }
    });
    const body = await response.json();
    assert.equal(body.ip, trusted ? '198.51.100.7' : '127.0.0.1');
    assert.equal(body.secure, trusted);
    assert.equal(response.headers.get('strict-transport-security'), trusted ? 'max-age=31536000' : null);
  }
});
