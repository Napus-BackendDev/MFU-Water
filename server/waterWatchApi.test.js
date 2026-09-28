import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'node:http';
import { createWaterWatchApi } from './waterWatchApi.js';

test('development API fails closed before contacting a Supabase Cloud endpoint', async t => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    ALLOW_CLOUD_SUPABASE: process.env.ALLOW_CLOUD_SUPABASE,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ADMIN_CSRF_SECRET: process.env.ADMIN_CSRF_SECRET
  };
  Object.assign(process.env, {
    NODE_ENV: 'development',
    ALLOW_CLOUD_SUPABASE: 'true',
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    ADMIN_CSRF_SECRET: 'x'.repeat(32)
  });
  t.after(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const app = express();
  app.use(express.json());
  app.use('/api', createWaterWatchApi());
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/samples`);
  const payload = await response.json();
  assert.equal(response.status, 503);
  assert.match(payload.error, /loopback/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
