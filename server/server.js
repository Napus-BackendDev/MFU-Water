import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import ee from '@google/earthengine';
import { analyzeGeeWater, parseGeeAnalysisQuery } from './geeWaterAnalysis.js';
import { compareThaTonFrames, getThaTonFrame, listThaTonFrames, parseThaTonPeriod } from './geeThaTonTimeline.js';
import { createWaterWatchApi } from './waterWatchApi.js';
import { configureHttp, mountWeb, validateProductionConfig } from './productionHosting.js';
import { loadGeeCredential, initializeGee } from './geeInitialization.js';
import { sendGeeFailure } from './geePublicErrors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const keyPath = path.join(__dirname, 'service-account.json');

const app = express();
const distPath = path.resolve(__dirname, '../dist');
const vercelRuntime = process.env.VERCEL === '1';
validateProductionConfig(process.env, distPath);
configureHttp(app, { trustProxy: process.env.TRUST_PROXY || false });
if (process.env.NODE_ENV !== 'production') app.use(cors());
app.use(express.json());
app.use('/api', createWaterWatchApi({ startWorker: !vercelRuntime && process.env.NODE_ENV === 'production' }));

let isGEEReady = false;
let geeClientEmail = '';
let cachedSentinelTileUrl = null;
let cachedNdwiTileUrl = null;
let cachedWaterTileUrl = null;

// Keep the status request pending until the initial GEE connection finishes.
const geeCredential = loadGeeCredential({ env: process.env,
  readLocal: () => fs.existsSync(keyPath) ? fs.readFileSync(keyPath, 'utf8') : null });
const geeInitialization = initializeGee(ee, geeCredential).then(result => {
  isGEEReady = result.ready;
  geeClientEmail = result.clientEmail;
  console.log(result.ready ? 'GEE connected' : 'GEE unavailable');
  return result.ready;
});

// 1. Health Status
app.get('/api/status', async (req, res) => {
  if (!isGEEReady) await geeInitialization;
  res.json({
    status: 'ok',
    geeConnected: isGEEReady,
    engine: 'Google Earth Engine API',
    clientEmail: geeClientEmail ? geeClientEmail.replace(/(?<=.{4}).(?=.*@)/g, '*') : null
  });
});

app.get('/api/gee/analyze', async (req, res) => {
  if (!isGEEReady) return res.status(503).json({ error: 'Google Earth Engine ยังไม่พร้อม' });
  let params;
  try {
    params = parseGeeAnalysisQuery(req.query);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  try {
    const result = await analyzeGeeWater(ee, params);
    return res.json(result);
  } catch (error) {
    return sendGeeFailure(res, error?.status);
  }
});

app.get('/api/gee/tha-ton-timeline', async (req, res) => {
  let period;
  try { period = parseThaTonPeriod(req.query); } catch (error) { return res.status(400).json({ error: error.message }); }
  if (!isGEEReady) await geeInitialization;
  if (!isGEEReady) return res.status(503).json({ error: 'Google Earth Engine ยังไม่พร้อม' });
  try {
    return res.json(await listThaTonFrames(ee, period));
  } catch (error) {
    return sendGeeFailure(res);
  }
});

app.get('/api/gee/tha-ton-timeline/frame/:index', async (req, res) => {
  let period;
  try { period = parseThaTonPeriod(req.query); } catch (error) { return res.status(400).json({ error: error.message }); }
  if (!isGEEReady) await geeInitialization;
  if (!isGEEReady) return res.status(503).json({ error: 'Google Earth Engine ยังไม่พร้อม' });
  if (!/^\d+$/.test(req.params.index)) return res.status(400).json({ error: 'ลำดับภาพไม่ถูกต้อง' });
  try {
    return res.json(await getThaTonFrame(ee, Number(req.params.index), period));
  } catch (error) {
    return sendGeeFailure(res, error?.status);
  }
});

app.get('/api/gee/tha-ton-compare', async (req, res) => {
  let period;
  try { period = parseThaTonPeriod(req.query); } catch (error) { return res.status(400).json({ error: error.message }); }
  if (!/^\d+$/.test(String(req.query.before || '')) || !/^\d+$/.test(String(req.query.after || ''))) {
    return res.status(400).json({ error: 'ระบุ before และ after เป็นลำดับภาพจำนวนเต็ม' });
  }
  if (!isGEEReady) await geeInitialization;
  if (!isGEEReady) return res.status(503).json({ error: 'Google Earth Engine ยังไม่พร้อม' });
  try {
    return res.json(await compareThaTonFrames(ee, Number(req.query.before), Number(req.query.after), period));
  } catch (error) {
    return sendGeeFailure(res, error?.status === 400 ? 400 : 502);
  }
});

// 2. GEE Core: Satellite Water Detection Layer (ผืนน้ำจริงจากดาวเทียมที่คำนวณผ่าน Google Earth Engine)
app.get('/api/gee/water-tiles', (req, res) => {
  if (!isGEEReady) {
    return res.status(503).json({ error: 'Google Earth Engine is not ready' });
  }

  if (cachedWaterTileUrl) {
    return res.json({ tileUrl: cachedWaterTileUrl, cached: true });
  }

  try {
    const roi = ee.Geometry.Rectangle([99.20, 19.80, 100.30, 20.30]);

    // ใช้ข้อมูล JRC Global Surface Water (วิเคราะห์ผิวน้ำจากดาวเทียมความละเอียดสูงของ GEE)
    const gsw = ee.Image('JRC/GSW1_4/GlobalSurfaceWater');
    const occurrence = gsw.select('occurrence').clip(roi);
    const waterMask = occurrence.gt(12); // ตรวจจับน้ำที่มีการไหล > 12%
    const waterLayer = occurrence.updateMask(waterMask);

    const visParams = {
      min: 12,
      max: 100,
      palette: ['#38bdf8', '#0284c7', '#0369a1']
    };

    waterLayer.getMap(visParams, (mapObj, err) => {
      if (err) {
        return sendGeeFailure(res, 500);
      }

      cachedWaterTileUrl = mapObj.urlFormat;
      res.json({ tileUrl: cachedWaterTileUrl, cached: false });
    });
  } catch (err) {
    sendGeeFailure(res, 500);
  }
});

// 3. Sentinel-2 True Color Tiles (Kok River Basin)
app.get('/api/gee/sentinel-tiles', (req, res) => {
  if (!isGEEReady) {
    return res.status(503).json({ error: 'Google Earth Engine is not ready' });
  }

  if (cachedSentinelTileUrl) {
    return res.json({ tileUrl: cachedSentinelTileUrl, cached: true });
  }

  try {
    const roi = ee.Geometry.Rectangle([99.30, 19.85, 100.20, 20.20]);
    const sentinel = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(roi)
      .filterDate('2024-01-01', '2024-06-30')
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
      .median()
      .clip(roi);

    const visParams = {
      bands: ['B4', 'B3', 'B2'],
      min: 0,
      max: 3000
    };

    sentinel.getMap(visParams, (mapObj, err) => {
      if (err) {
        return sendGeeFailure(res, 500);
      }

      cachedSentinelTileUrl = mapObj.urlFormat;
      res.json({ tileUrl: cachedSentinelTileUrl, cached: false });
    });
  } catch (err) {
    sendGeeFailure(res, 500);
  }
});

// 4. NDWI Water Surface Detection Layer
app.get('/api/gee/ndwi-tiles', (req, res) => {
  if (!isGEEReady) {
    return res.status(503).json({ error: 'Google Earth Engine is not ready' });
  }

  if (cachedNdwiTileUrl) {
    return res.json({ tileUrl: cachedNdwiTileUrl, cached: true });
  }

  try {
    const roi = ee.Geometry.Rectangle([99.30, 19.85, 100.20, 20.20]);
    const sentinel = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(roi)
      .filterDate('2024-01-01', '2024-06-30')
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
      .median()
      .clip(roi);

    const ndwi = sentinel.normalizedDifference(['B3', 'B8']);
    const ndwiParams = {
      min: -0.2,
      max: 0.5,
      palette: ['#0f172a', '#0284c7', '#38bdf8', '#bae6fd']
    };

    ndwi.getMap(ndwiParams, (mapObj, err) => {
      if (err) {
        return sendGeeFailure(res, 500);
      }

      cachedNdwiTileUrl = mapObj.urlFormat;
      res.json({ tileUrl: cachedNdwiTileUrl, cached: false });
    });
  } catch (err) {
    sendGeeFailure(res, 500);
  }
});

// 5. Accurate Kok River GeoJSON (1,934 curve vertices)
app.get('/api/gee/river-geojson', (req, res) => {
  const filePath = path.join(__dirname, '../src/data/kokRiverAccurate.json');
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } else {
    res.status(404).json({ error: 'River geojson not found' });
  }
});

// 6. GEE Flood Inundation Comparison (เปรียบเทียบน้ำปกติ vs น้ำท่วมจริงจากดาวเทียมที่ ต.ท่าตอน)
let cachedNormalTileUrl = null;
let cachedFloodTileUrl = null;

app.get('/api/gee/flood-comparison', async (req, res) => {
  if (!isGEEReady) {
    return res.status(503).json({ error: 'Google Earth Engine is not ready' });
  }

  try {
    const roi = ee.Geometry.Rectangle([99.30, 20.02, 99.44, 20.10]);

    // ถ้าแคชไว้แล้ว ส่งกลับทันที
    if (cachedNormalTileUrl && cachedFloodTileUrl) {
      return res.json({
        normalTileUrl: cachedNormalTileUrl,
        floodTileUrl: cachedFloodTileUrl,
        cached: true
      });
    }

    // น้ำปกติ (Normal Baseline: เม.ย. - พ.ค. 2024 ก่อนเข้าฤดูมรสุม)
    const normalS2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(roi)
      .filterDate('2024-03-01', '2024-05-01')
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
      .median()
      .clip(roi);
    const normalNdwi = normalS2.normalizedDifference(['B3', 'B8']);
    const normalWater = normalNdwi.gt(0.02);

    // น้ำท่วมสูงสุด (Peak Flood: ช่วงพายุและน้ำหลาก ก.ย. 2024 จากดาวเทียมเรดาร์ Sentinel-1 SAR)
    const s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
      .filterBounds(roi)
      .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
      .filter(ee.Filter.eq('instrumentMode', 'IW'))
      .filterDate('2024-09-10', '2024-09-25');

    const s1Img = s1.select('VV').min().clip(roi);
    const floodWater = s1Img.lt(-15.0); // ค่าการสะท้อนของผิวน้ำเรดาร์

    normalWater.updateMask(normalWater).getMap({
      min: 0,
      max: 1,
      palette: ['#0284c7']
    }, (normalMap, normalErr) => {
      if (normalErr) return sendGeeFailure(res, 500);
      cachedNormalTileUrl = normalMap.urlFormat;

      floodWater.updateMask(floodWater).getMap({
        min: 0,
        max: 1,
        palette: ['#38bdf8']
      }, (floodMap, floodErr) => {
        if (floodErr) return sendGeeFailure(res, 500);
        cachedFloodTileUrl = floodMap.urlFormat;

        res.json({
          normalTileUrl: cachedNormalTileUrl,
          floodTileUrl: cachedFloodTileUrl,
          cached: false
        });
      });
    });
  } catch (err) {
    sendGeeFailure(res, 500);
  }
});


app.use('/api', (req, res) => res.status(404).json({ error: 'ไม่พบ API นี้ กรุณาเริ่มเซิร์ฟเวอร์รุ่นล่าสุด' }));
mountWeb(app, distPath, { serveStatic: !vercelRuntime });

export default app;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const PORT = Number(process.env.PORT) || 5001;
  const server = app.listen(PORT, process.env.HOST || '127.0.0.1', () => {
    console.log(`🚀 GEE Backend Server running on http://localhost:${PORT}`);
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => { server.closeAllConnections(); process.exit(1); }, 10_000).unref();
  });
}
