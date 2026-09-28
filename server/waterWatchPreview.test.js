import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createWaterWatchPreviewApp } from './waterWatchPreview.js';

test('preview mounts sample API rather than returning the SPA, without remote DB access', async t => {
  const saved = process.env.SUPABASE_URL;
  delete process.env.SUPABASE_URL;
  t.after(() => {
    if (saved === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = saved;
  });
  const server = createServer(createWaterWatchPreviewApp());
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${base}/api/samples`);
  assert.equal(response.status, 503);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match((await response.json()).error, /Supabase/);
  const unknown = await fetch(`${base}/api/not-a-route`);
  assert.equal(unknown.status, 404);
  assert.match(unknown.headers.get('content-type'), /application\/json/);
  process.env.SUPABASE_URL = 'https://example.invalid';
  const blocked = await fetch(`${base}/api/samples`);
  assert.equal(blocked.status, 503);
  assert.match((await blocked.json()).error, /loopback/);
});
