// Per-process guard. A multi-instance deployment also needs an edge/shared quota.
export function submissionLimiter({ maxRequests = 10, windowMs = 3_600_000, maxConcurrent = 4, maxKeys = 10_000, now = Date.now } = {}) {
  const clients = new Map();
  let active = 0;
  return (req, res, next) => {
    const time = now();
    for (const [key, value] of clients) if (value.expires <= time) clients.delete(key);
    const key = req.ip || 'unknown';
    if (active >= maxConcurrent || !clients.has(key) && clients.size >= maxKeys) {
      return res.status(503).set('Retry-After', '5').json({ error: 'ระบบรับรูปกำลังใช้งานเต็ม กรุณาลองใหม่' });
    }
    const bucket = clients.get(key) || { count: 0, expires: time + windowMs };
    if (bucket.count >= maxRequests) {
      return res.status(429).set('Retry-After', String(Math.max(1, Math.ceil((bucket.expires - time) / 1000)))).json({ error: 'ส่งผลตรวจถี่เกินไป กรุณาลองใหม่ภายหลัง' });
    }
    bucket.count++;
    clients.set(key, bucket);
    active++;
    let released = false;
    const release = () => { if (!released) { released = true; active--; } };
    res.once('finish', release);
    res.once('close', release);
    next();
  };
}
