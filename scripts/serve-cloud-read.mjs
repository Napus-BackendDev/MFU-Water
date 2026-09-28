import express from 'express';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createWaterWatchApi } from '../server/waterWatchApi.js';

export function createReadOnlyMapApp({ getPublicClients } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    if (!['localhost', '127.0.0.1', '[::1]'].includes(req.hostname)) return res.status(403).end();
    if (req.get('sec-fetch-site') === 'cross-site') return res.status(403).end();
    if (req.get('origin') && req.get('origin') !== `http://${req.get('host')}`) return res.status(403).end();
    next();
  });
  app.use('/api', createWaterWatchApi({ startWorker: false, publicReadOnly: true, getPublicClients }));
  app.use('/api', (req, res) => res.status(404).set('Cache-Control', 'no-store').json({ error: 'ไม่พบ API' }));
  const dist = resolve(import.meta.dirname, '../dist');
  app.use(express.static(dist, { dotfiles: 'deny', etag: false }));
  app.use((req, res) => {
    if (req.method === 'GET' && req.accepts('html')) return res.sendFile(resolve(dist, 'index.html'));
    res.status(404).end();
  });
  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const index = process.argv.indexOf('--expected-host');
  try {
    const url = new URL(process.env.SUPABASE_URL || '');
    if (process.env.NODE_ENV !== 'production' || !process.env.SUPABASE_SERVICE_ROLE_KEY
      || index < 0 || url.hostname !== process.argv[index + 1] || !/^[a-z0-9]+\.supabase\.co$/.test(url.hostname)
      || url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || url.pathname !== '/') {
      throw new Error('approved_target_mismatch');
    }
    if (!existsSync(resolve(import.meta.dirname, '../dist/index.html'))) throw new Error('build_required');
    const server = createServer(createReadOnlyMapApp());
    server.on('error', () => { console.error('read_only_map_start_failed'); process.exitCode = 1; });
    server.listen(4180, '127.0.0.1', () => console.log('Read-only map ready: http://127.0.0.1:4180/#water-watch'));
    const expiry = setTimeout(() => {
      server.closeAllConnections();
      server.close(() => process.exit(0));
    }, 55 * 60 * 1000);
    expiry.unref();
  } catch (error) {
    console.error(['approved_target_mismatch', 'build_required'].includes(error.message) ? error.message : 'read_only_map_start_failed');
    process.exitCode = 1;
  }
}
