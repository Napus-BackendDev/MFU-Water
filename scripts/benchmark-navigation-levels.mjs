import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { performance } from 'node:perf_hooks';
const root = new URL('../public/data/boundaries/', import.meta.url);
const country = await readFile(new URL('thailand-navigation.geojson.gz', root));
const before = await readFile(new URL('thailand-provinces.geojson.gz', root));
const after = await readFile(new URL('thailand-regions.geojson.gz', root));
const timings = { before: [], after: [] };
for (let round = 0; round < 5; round++) {
  for (const [key, data] of [['before', before], ['after', after]]) {
    const start = performance.now();
    JSON.parse(gunzipSync(country).toString());
    JSON.parse(gunzipSync(data).toString());
    timings[key].push(performance.now() - start);
  }
}
const median = list => [...list].sort((a,b) => a-b)[2];
console.log(JSON.stringify({ scope: 'Local production geography assets: gzip decode + JSON parse only; excludes network, basemap provider, rendering', rounds: 5, transferBytes: { before: country.length + before.length, after: country.length + after.length }, medianMs: { before: median(timings.before), after: median(timings.after) }, timings }, null, 2));
