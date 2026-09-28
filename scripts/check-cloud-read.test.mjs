import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCloudRead } from './check-cloud-read.mjs';

const env = { NODE_ENV: 'production', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-only-placeholder' };

test('cloud diagnostic only issues HEAD and outputs counts, never records or credentials', async () => {
  const calls = [];
  const result = await checkCloudRead({ env, expectedHost: 'example.supabase.co', fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return new Response(null, { status: 200, headers: { 'content-range': '0-0/2' } });
  } });
  assert.equal(calls.length, 6);
  assert.ok(calls.every(call => call.options.method === 'HEAD' && call.options.redirect === 'error'));
  assert.ok(calls.every(call => call.url.pathname === '/rest/v1/kok_water_samples' && call.url.searchParams.get('select') === 'sample_code'));
  assert.equal(result.counts.pending_review, 2);
  assert.ok(!JSON.stringify(result).includes(env.SUPABASE_SERVICE_ROLE_KEY));
});

test('cloud diagnostic rejects wrong target or non-production before network calls', async () => {
  const fetchImpl = () => { assert.fail('network must not be reached'); };
  await assert.rejects(checkCloudRead({ env, expectedHost: 'different.supabase.co', fetchImpl }), /approved_target_mismatch/);
  await assert.rejects(checkCloudRead({ env: { ...env, NODE_ENV: 'development' }, expectedHost: 'example.supabase.co', fetchImpl }), /production_mode_required/);
});

test('cloud diagnostic does not turn failed reads or unknown counts into zero data', async () => {
  await assert.rejects(checkCloudRead({ env, expectedHost: 'example.supabase.co', fetchImpl: async () => new Response(null, { status: 403 }) }), /read_failed_http_403/);
  await assert.rejects(checkCloudRead({ env, expectedHost: 'example.supabase.co', fetchImpl: async () => new Response(null, { status: 200 }) }), /exact_count_unavailable/);
});
