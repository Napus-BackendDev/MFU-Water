import test from 'node:test';
import assert from 'node:assert/strict';
import { publicRequest, fetchSamplesFromSupabase } from './publicSamples.js';

test('HTML preview fallback is diagnosed as an unconnected Express API, not zero samples', async () => {
  await assert.rejects(publicRequest('/api/samples', { fetchImpl: async () => new Response('<!doctype html><html></html>', { headers: { 'Content-Type': 'text/html' } }) }), error => error.code === 'API_NOT_JSON' && /Express API/.test(error.message));
});

test('public samples load through Express and keep only published values', async () => {
  let requested;
  const data = await fetchSamplesFromSupabase({ fetchImpl: async (url, options) => {
    requested = { url, options };
    return Response.json({ data: [
      { sample_code: 'published', publication_status: 'auto_published', measurements: { arsenic: { value: 50 } } },
      { sample_code: 'pending', publication_status: 'pending_review', measurements: { arsenic: { value: 200 } } },
      { sample_code: 'invalid-auto', publication_status: 'auto_published', measurements: { arsenic: { value: 100 } } }
    ] });
  } });
  assert.equal(requested.url, '/api/samples');
  assert.equal(requested.options.cache, 'no-store');
  assert.deepEqual(data.map(row => row.sample_code), ['published']);
});

test('failed or malformed JSON is not converted into an empty successful response', async () => {
  await assert.rejects(publicRequest('/api/samples', { fetchImpl: async () => Response.json({ error: 'Unavailable' }, { status: 503 }) }), /Unavailable/);
  await assert.rejects(publicRequest('/api/samples', { fetchImpl: async () => new Response('{', { headers: { 'Content-Type': 'application/json' } }) }), /JSON/);
});
