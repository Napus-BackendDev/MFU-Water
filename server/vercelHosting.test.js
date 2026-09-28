import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import multer from 'multer';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createVercelHandler } from './vercelHandler.js';
import { mountWeb, validateProductionConfig } from './productionHosting.js';

const fixture = { NODE_ENV: 'production', VERCEL: '1', GEE_SERVICE_ACCOUNT_JSON: '', SUPABASE_URL: 'https://db.invalid', PUBLIC_APP_URL: 'https://app.invalid', SUPABASE_ANON_KEY: 'test-only', SUPABASE_SERVICE_ROLE_KEY: 'test-only', ADMIN_CSRF_SECRET: 'x'.repeat(32) };
const missing = resolve(import.meta.dirname, '../dist/not-a-build');
test('Vercel requires all production security configuration but not CDN files inside function', () => {
  assert.doesNotThrow(() => validateProductionConfig(fixture, missing));
  assert.throws(() => validateProductionConfig({ ...fixture, VERCEL: undefined }, missing), /build_required/);
  assert.throws(() => validateProductionConfig({ ...fixture, SUPABASE_SERVICE_ROLE_KEY: '' }, missing), /config_missing/);
  assert.throws(() => validateProductionConfig({ ...fixture, ENABLE_SMTP_DELIVERY: 'true' }, missing), /vercel_smtp_requires_durable_worker/);
  assert.throws(() => validateProductionConfig({ ...fixture, ENABLE_ADMIN_INVITES: 'true' }, missing), /invites/);
});

async function listen(t, handler) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}
test('function adapter preserves API URL/query/JSON, reuses app, and never serves missing static HTML', async t => {
  let loads = 0;
  const app = express();
  app.use(express.json());
  app.post('/api/mock', (req, res) => res.json({ path: req.path, query: req.query, body: req.body }));
  app.use('/api', (req, res) => res.status(404).json({ error: 'not_found' }));
  mountWeb(app, missing, { serveStatic: false });
  const origin = await listen(t, createVercelHandler(async () => { loads++; return app; }));
  const response = await fetch(origin + '/api/mock?q=1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: 5 }) });
  assert.deepEqual(await response.json(), { path: '/api/mock', query: { q: '1' }, body: { value: 5 } });
  assert.equal((await fetch(origin + '/api/missing')).status, 404);
  assert.equal((await fetch(origin + '/assets/missing.js')).status, 404);
  assert.equal((await fetch(origin)).status, 404);
  assert.equal((await (await fetch(origin + '/healthz')).json()).database, 'not_checked');
  assert.equal(loads, 1);
});
test('startup failure returns sanitized JSON, not provider secrets or HTML', async t => {
  const origin = await listen(t, createVercelHandler(() => { throw new Error('fixture-private-value'); }));
  const response = await fetch(origin + '/api/samples');
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('content-type'), /application\/json/);
  const body = await response.text();
  assert.doesNotMatch(body, /fixture-private-value|<!doctype/i);
});
test('adapter preserves multipart, cookies and nested routes; malformed JSON stays a JSON 400', async t => {
  const app = express();
  app.use(express.json());
  app.post('/api/mock/:id/photos', multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 } }).single('photo'), (req, res) => {
    res.json({ id: req.params.id, query: req.query, cookie: req.headers.cookie, text: req.body.note, photo: req.file.buffer.toString() });
  });
  mountWeb(app, missing, { serveStatic: false });
  const origin = await listen(t, createVercelHandler(() => app));
  const data = new FormData();
  data.append('note', 'fixture-only');
  data.append('photo', new Blob(['mock-evidence'], { type: 'text/plain' }), 'fixture.txt');
  const response = await fetch(origin + '/api/mock/123/photos?q=2', { method: 'POST', headers: { Cookie: 'fixture=only' }, body: data });
  assert.deepEqual(await response.json(), { id: '123', query: { q: '2' }, cookie: 'fixture=only', text: 'fixture-only', photo: 'mock-evidence' });
  const malformed = await fetch(origin + '/api/mock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{invalid' });
  assert.equal(malformed.status, 400);
  assert.match(malformed.headers.get('content-type'), /application\/json/);
  assert.equal(malformed.headers.get('cache-control'), 'no-store');
});
test('Vercel config routes API before static and excludes credentials and geometry from function', () => {
  const config = JSON.parse(readFileSync(resolve(import.meta.dirname, '../vercel.json')));
  assert.equal(config.framework, 'vite');
  assert.equal(config.rewrites.find(route => route.source === '/api/:path*')?.destination, '/api/index');
  assert.ok(!config.rewrites.some(route => route.source === '/(.*)'));
  const excluded = config.functions['api/index.js'].excludeFiles;
  for (const pattern of ['public/**', 'dist/**', 'server/service-account*.json', '.env*']) assert.ok(excluded.includes(pattern));
  const backendBoundary = JSON.parse(readFileSync(resolve(import.meta.dirname, './data/tha-ton-adm3.geojson')));
  const frontendBoundary = JSON.parse(readFileSync(resolve(import.meta.dirname, '../public/data/boundaries/tha-ton-adm3.geojson')));
  assert.deepEqual(backendBoundary, frontendBoundary, 'backend and frontend retain the exact historical boundary');
  const entry = readFileSync(resolve(import.meta.dirname, '../api/index.js'), 'utf8');
  assert.match(entry, /export \{ default \} from '\.\.\/server\/server\.js'/);
  assert.doesNotMatch(entry, /bodyParser: false/);
  const server = readFileSync(resolve(import.meta.dirname, 'server.js'), 'utf8');
  assert.match(server, /startWorker: !vercelRuntime && process\.env\.NODE_ENV === 'production'/);
});
test('real Express adapter initializes with test-only config without any external request', async t => {
  const previous = Object.fromEntries(Object.keys(fixture).map(key => [key, process.env[key]]));
  const delivery = process.env.ENABLE_SMTP_DELIVERY;
  const invites = process.env.ENABLE_ADMIN_INVITES;
  Object.assign(process.env, fixture, { ENABLE_SMTP_DELIVERY: 'false', ENABLE_ADMIN_INVITES: 'false' });
  const originalFetch = globalThis.fetch;
  let externalCalls = 0;
  globalThis.fetch = (...args) => {
    const url = new URL(typeof args[0] === 'string' ? args[0] : args[0].url);
    if (url.hostname !== '127.0.0.1') { externalCalls++; throw new Error('external_network_forbidden_in_test'); }
    return originalFetch(...args);
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries({ ...previous, ENABLE_SMTP_DELIVERY: delivery, ENABLE_ADMIN_INVITES: invites })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  const { default: handler } = await import('../api/index.js');
  assert.equal(typeof handler.listen, 'function', 'real Express entry bypasses Vercel Node body helpers');
  const origin = await listen(t, handler);
  const health = await fetch(origin + '/healthz');
  assert.equal(health.status, 200);
  assert.equal((await health.json()).database, 'not_checked');
  const status = await fetch(origin + '/api/status');
  assert.equal((await status.json()).geeConnected, false);
  const missingApi = await fetch(origin + '/api/not-a-route');
  assert.equal(missingApi.status, 404);
  assert.match(missingApi.headers.get('content-type'), /application\/json/);
  assert.equal((await fetch(origin + '/assets/missing.js')).status, 404);
  const csrf = await fetch(origin + '/api/security/csrf');
  assert.equal(csrf.status, 200);
  assert.equal(typeof (await csrf.json()).csrfToken, 'string');
  assert.match(csrf.headers.get('set-cookie'), /Secure/);
  assert.equal(externalCalls, 0);
});
