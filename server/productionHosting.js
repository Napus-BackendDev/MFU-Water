import express from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { isIP } from 'node:net';

// Explicit proxy addresses only. Never accept trust-all or hop-count settings.
export function parseTrustProxy(value) {
  if (value === undefined || value === false || typeof value === 'string' && (!value.trim() || value.trim() === 'false')) return false;
  if (typeof value !== 'string') throw new Error('invalid_trust_proxy');
  const addresses = value.split(',').map(address => address.trim());
  if (addresses.length > 64) throw new Error('invalid_trust_proxy');
  for (const address of addresses) {
    const parts = address.split('/');
    const family = isIP(parts[0]);
    if (!family || parts.length > 2 || parts[0].includes('%')) throw new Error('invalid_trust_proxy');
    if (parts.length === 2) {
      const prefix = Number(parts[1]);
      const minimum = family === 4 ? 8 : 32;
      const maximum = family === 4 ? 32 : 128;
      const mappedIPv4 = family === 6 && /^\[::ffff:/i.test(new URL(`http://[${parts[0]}]/`).hostname);
      if (!/^\d+$/.test(parts[1]) || prefix < minimum || prefix > maximum || mappedIPv4) throw new Error('invalid_trust_proxy');
    }
  }
  return addresses;
}

// Pure validation: no database, authentication or network operation.
export function validateProductionConfig(env, dist) {
  if (env.NODE_ENV !== 'production') return;
  parseTrustProxy(env.TRUST_PROXY);
  for (const key of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_CSRF_SECRET', 'PUBLIC_APP_URL']) {
    if (!env[key] || /replace-|your-project|your-app/.test(env[key])) throw new Error(`production_config_missing:${key}`);
  }
  if (env.ADMIN_CSRF_SECRET.length < 32) throw new Error('production_csrf_secret_too_short');
  for (const key of ['SUPABASE_URL', 'PUBLIC_APP_URL']) {
    const url = new URL(env[key]);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error(`production_https_origin_required:${key}`);
  }
  if (env.ENABLE_ADMIN_INVITES === 'true') throw new Error('production_invites_require_verified_password_setup');
  if (env.VERCEL === '1' && env.ENABLE_SMTP_DELIVERY === 'true') throw new Error('vercel_smtp_requires_durable_worker');
  // Vercel serves the build from its CDN, not from the API function filesystem.
  if (env.VERCEL !== '1' && !existsSync(resolve(dist, 'index.html'))) throw new Error('production_build_required');
}
export function configureHttp(app, { trustProxy = false } = {}) {
  app.disable('x-powered-by');
  app.set('trust proxy', parseTrustProxy(trustProxy));
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (req.secure) res.set('Strict-Transport-Security', 'max-age=31536000');
    next();
  });
}
// Mount after API routes: API errors and missing chunks must never return HTML.
export function mountWeb(app, dist, { serveStatic = true } = {}) {
  app.get('/healthz', (req, res) => res.set('Cache-Control', 'no-store').json({ status: 'alive', database: 'not_checked' }));
  if (serveStatic) {
    app.use(express.static(dist, {
      dotfiles: 'deny', index: false,
      setHeaders(res, file) {
        const hashed = /[\\/]assets[\\/].+-[A-Za-z0-9_-]{8,}\.(?:js|css)$/.test(file);
        res.set('Cache-Control', hashed ? 'public, max-age=31536000, immutable' : 'no-cache');
      }
    }));
    app.use((req, res, next) => {
      if (!['GET', 'HEAD'].includes(req.method) || req.path !== '/' && req.path !== '/index.html') return next();
      res.set('Cache-Control', 'no-store').sendFile(resolve(dist, 'index.html'));
    });
  }
  app.use((req, res) => res.status(404).set('Cache-Control', 'no-store').end());
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.type === 'entity.too.large' ? 413 : error instanceof SyntaxError ? 400 : 500;
    res.status(status).set('Cache-Control', 'no-store').json({ error: 'คำขอไม่สำเร็จ' });
  });
}
