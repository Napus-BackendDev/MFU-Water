import express from 'express';
import { createWaterWatchApi } from './waterWatchApi.js';

// Vite preview serves the SPA, but public reads and submissions still need Express.
// Do not import server.js: its Earth Engine startup is unrelated to this preview.
export function createWaterWatchPreviewApp() {
  const app = express();
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const target = process.env.SUPABASE_URL;
    if (target) {
      try {
        const { hostname } = new URL(target);
        if (!['localhost', '127.0.0.1', '[::1]'].includes(hostname)) {
          return res.status(503).json({ error: 'Preview development ต้องใช้ Supabase บน loopback; ยังไม่ได้เชื่อมฐานข้อมูลสำหรับโหลดหมุด' });
        }
      } catch {
        return res.status(503).json({ error: 'ตั้งค่า Supabase ฝั่งเซิร์ฟเวอร์ไม่ถูกต้อง' });
      }
    }
    next();
  });
  app.use(express.json());
  app.use('/api', createWaterWatchApi({ startWorker: false }));
  app.use('/api', (req, res) => res.status(404).json({ error: 'ไม่พบ API ที่ร้องขอ' }));
  return app;
}
