import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

test('patched Vite transforms React and bundled map worker without loading API or env files', async t => {
  const root = resolve(import.meta.dirname, '..');
  const server = await createServer({
    configFile: false, envFile: false, root,
    cacheDir: resolve(root, '.npm-cache-production-ready/vite-smoke'),
    plugins: [react()], optimizeDeps: { noDiscovery: true, include: [] },
    server: { host: '127.0.0.1', port: 0, open: false, watch: null,
      fs: { strict: true, allow: [root], deny: ['**/package.json', '**/.env*'] } }
  });
  t.after(async () => { server.httpServer.closeAllConnections(); await server.close(); });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const request = pathname => fetch(origin + pathname, { signal: AbortSignal.timeout(10000) });
  const main = await request('/src/main.jsx');
  assert.equal(main.status, 200);
  assert.match(await main.text(), /setWorkerUrl/);
  const app = await request('/src/App.jsx');
  assert.equal(app.status, 200);
  assert.match(await app.text(), /react-refresh/);
  const worker = await request('/node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url');
  assert.equal(worker.status, 200);
  assert.match(await worker.text(), /export default/);
  const denied = await request('/package.json');
  assert.equal(denied.status, 403);
  assert.match(await denied.text(), /Restricted/);
});
