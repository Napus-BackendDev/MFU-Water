// Lazy initialization keeps secrets out of build-time imports and reuses Express.
// Inject a local mock app for tests; the default preserves every existing route.
export function createVercelHandler(loadApp = () => import('./server.js').then(module => module.default)) {
  let application;
  return async (req, res) => {
    try {
      application ||= Promise.resolve().then(loadApp);
      const app = await application;
      return app(req, res);
    } catch {
      if (res.headersSent) return res.end();
      // Startup errors can contain provider URLs or secrets. Never return them.
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify({ error: 'API ยังไม่พร้อม กรุณาตรวจ configuration ฝั่งเซิร์ฟเวอร์' }));
    }
  };
}
