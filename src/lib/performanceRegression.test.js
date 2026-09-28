import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fetchSamplesFromSupabase } from './publicSamples.js';
import { startPublishedPolling } from './publishedPolling.js';
import { createBoundaryLoader } from '../components/KokWaterWatch/boundaryLoader.js';
import { getTimeReference, isWithinTimeRange } from '../components/KokWaterWatch/timeFilters.js';
import { clusterSubmissions } from '../data/waterWatchData.js';

test('public API uses no-store and abort signal, excludes unpublished and stale revisions', async () => {
  const signal = new AbortController().signal;
  const rows = [49.999, 50, 50.001, 100].map(arsenic_ppb => ({ arsenic_ppb, publication_status: 'auto_published' }));
  rows.push({ arsenic_ppb: 100, publication_status: 'approved', revision: 2 }, { arsenic_ppb: 100, publication_status: 'approved', revision: 2, approved_revision: 1 }, { arsenic_ppb: 5, publication_status: 'pending_review' });
  const result = await fetchSamplesFromSupabase({ signal, fetchImpl: async (url, options) => {
    assert.equal(url, '/api/samples'); assert.equal(options.cache, 'no-store'); assert.equal(options.signal, signal);
    return new Response(JSON.stringify({ data: rows }), { headers: { 'content-type': 'application/json' } });
  } });
  assert.deepEqual(result.map(row => row.arsenic_ppb), [49.999, 50, 100]);
});

test('API failure makes one request, never falls back to raw Supabase', async () => {
  let calls = 0;
  await assert.rejects(fetchSamplesFromSupabase({ fetchImpl: async () => { calls++; return new Response('<html>unavailable</html>', { status: 503 }); } }));
  assert.equal(calls, 1);
});

test('boundary requests and JSON parsing are shared; failed loads can retry', async () => {
  let calls = 0, parses = 0;
  const load = createBoundaryLoader(async () => { calls++; return { ok: true, json: async () => { parses++; return { features: [] }; } }; });
  const [a, b] = await Promise.all([load('provinces'), load('provinces')]);
  assert.equal(a, b); assert.equal(calls, 1); assert.equal(parses, 1);
  let attempts = 0;
  const retry = createBoundaryLoader(async () => ({ ok: ++attempts > 1, json: async () => ({}) }));
  await assert.rejects(retry('provinces')); await retry('provinces'); assert.equal(attempts, 2);
});

test('country loader replaces historical Thailand with canonical COD union but preserves neighbors', async () => {
  const root = new URL('../../public/data/boundaries/', import.meta.url);
  const original = JSON.parse(await readFile(new URL('se-asia-countries.geojson', root)));
  const split = JSON.parse(await readFile(new URL('thailand-navigation.geojson', root)));
  const load = createBoundaryLoader(async path => ({ ok: true, json: async () => path.includes('se-asia') ? original : split }));
  const combined = await load('countries');
  assert.deepEqual(combined.features.filter(f => f.properties.shapeISO === 'THA'), split.features);
  assert.deepEqual(combined.features.filter(f => f.properties.shapeISO !== 'THA'), original.features.filter(f => f.properties.shapeISO !== 'THA'));
});

test('time filtering stays deterministic for 100 and 1000 records', () => {
  const now = Date.parse('2026-09-28T12:00:00+07:00');
  for (const [size, expected] of [[100, [100, 25, 100]], [1000, [1000, 25, 169]]]) {
    const rows = Array.from({ length: size }, (_, i) => ({ collection_time: new Date(now - i * 3600000).toISOString() }));
    const ref = getTimeReference(rows, now);
    assert.deepEqual(['all', 'today', '7days'].map(filter => rows.filter(row => isWithinTimeRange(row.collection_time, filter, '', '', ref)).length), expected);
  }
});

test('100 and 1000 records preserve pair clustering and newest sample coordinates', () => {
  const now = Date.parse('2026-09-28T12:00:00+07:00');
  for (const size of [100, 1000]) {
    const rows = Array.from({ length: size }, (_, i) => {
      const group = Math.floor(i / 2);
      return { sample_code: `S-${i}`, coordinates: [99 + group % 25 * .01, 19 + Math.floor(group / 25) * .01], collection_time: new Date(now - i * 3600000).toISOString(), measurements: { arsenic: { value: i % 2 ? 50 : 5 } }, images: [] };
    });
    const result = clusterSubmissions(rows);
    assert.equal(result.clusters.length, size / 2);
    assert.equal(result.singlePoints.length, 0);
    for (const [index, cluster] of result.clusters.entries()) {
      assert.equal(cluster.items.length, 2);
      assert.equal(cluster.items[0].sample_code, `S-${index * 2}`);
      assert.deepEqual(cluster.coordinates, rows[index * 2].coordinates);
    }
  }
});

test('polling serializes refreshes, aborts when hidden and suppresses stale results', async () => {
  const visibility = new EventTarget(); visibility.hidden = false;
  const pending = [], signals = [], results = [];
  const poller = startPublishedPolling({ visibility, load: ({ signal }) => { signals.push(signal); return new Promise(resolve => pending.push(resolve)); }, onData: data => results.push(data), onError: assert.fail, schedule: () => 1, cancel: () => {} });
  await Promise.resolve(); await Promise.resolve();
  poller.refresh(); poller.refresh(); assert.equal(pending.length, 1);
  visibility.hidden = true; visibility.dispatchEvent(new Event('visibilitychange'));
  assert.equal(signals[0].aborted, true);
  pending.shift()(['stale']); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(results, []);
  visibility.hidden = false; visibility.dispatchEvent(new Event('visibilitychange'));
  await Promise.resolve(); await Promise.resolve(); assert.equal(pending.length, 1);
  poller.stop(); pending.shift()(['withdrawn']); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(results, []);
});
