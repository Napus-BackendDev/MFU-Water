import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import ee from '@google/earthengine';
import { analyzeGeeWater, parseGeeAnalysisQuery } from './geeWaterAnalysis.js';
import { getThaTonFrame, listThaTonFrames } from './geeThaTonTimeline.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const keyPath = path.join(__dirname, 'service-account.json');

const app = express();
app.use(cors());
app.use(express.json());

let isGEEReady = false;
let geeClientEmail = '';
let cachedSentinelTileUrl = null;
let cachedNdwiTileUrl = null;
let cachedWaterTileUrl = null;

// Keep the status request pending until the initial GEE connection finishes.
const geeInitialization = new Promise((resolve) => {
  if (!fs.existsSync(keyPath)) {
    console.warn('⚠️ service-account.json not found in server directory');
    resolve(false);
    return;
  }
  const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  geeClientEmail = key.client_email;
  const timeout = setTimeout(() => resolve(false), 15000);
  const finish = (ready) => {
    clearTimeout(timeout);
    resolve(ready);
  };
  ee.data.authenticateViaPrivateKey(
    key,
    () => {
      ee.initialize(null, null, () => {
        isGEEReady = true;
        console.log('✅ Google Earth Engine connected');
        finish(true);
      }, (err) => {
        console.error('GEE Initialize error:', err.message || err);
        finish(false);
      });
    },
    (err) => {
      console.error('GEE Auth error:', err.message || err);
      finish(false);
    }
  );
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
    console.error('GEE water analysis failed:', error);
    return res.status(error.status || 502).json({ error: error.message || 'GEE วิเคราะห์ไม่สำเร็จ' });
  }
});

app.get('/api/gee/tha-ton-timeline', async (req, res) => {
  if (!isGEEReady) await geeInitialization;
  if (!isGEEReady) return res.status(503).json({ error: 'Google Earth Engine ยังไม่พร้อม' });
  try {
    return res.json(await listThaTonFrames(ee));
  } catch (error) {
    console.error('Tha Ton scene listing failed:', error);
    return res.status(502).json({ error: 'โหลดรายการภาพจาก Earth Engine ไม่สำเร็จ' });
  }
});

app.get('/api/gee/tha-ton-timeline/frame/:index', async (req, res) => {
  if (!isGEEReady) await geeInitialization;
  if (!isGEEReady) return res.status(503).json({ error: 'Google Earth Engine ยังไม่พร้อม' });
  if (!/^\d+$/.test(req.params.index)) return res.status(400).json({ error: 'ลำดับภาพไม่ถูกต้อง' });
  try {
    return res.json(await getThaTonFrame(ee, Number(req.params.index)));
  } catch (error) {
    console.error('Tha Ton frame failed:', error);
    return res.status(error.status || 502).json({ error: error.status === 404 ? error.message : 'โหลดภาพจาก Earth Engine ไม่สำเร็จ' });
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
        console.error('Error generating GEE Water tiles:', err);
        return res.status(500).json({ error: err.message || err });
      }

      cachedWaterTileUrl = mapObj.urlFormat;
      console.log('✅ Generated GEE Water Tiles from Satellite Data:', cachedWaterTileUrl);
      res.json({ tileUrl: cachedWaterTileUrl, cached: false });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
        console.error('Error generating Sentinel tiles:', err);
        return res.status(500).json({ error: err.message || err });
      }

      cachedSentinelTileUrl = mapObj.urlFormat;
      res.json({ tileUrl: cachedSentinelTileUrl, cached: false });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
        console.error('Error generating NDWI tiles:', err);
        return res.status(500).json({ error: err.message || err });
      }

      cachedNdwiTileUrl = mapObj.urlFormat;
      res.json({ tileUrl: cachedNdwiTileUrl, cached: false });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
      if (normalErr) return res.status(500).json({ error: normalErr.message });
      cachedNormalTileUrl = normalMap.urlFormat;

      floodWater.updateMask(floodWater).getMap({
        min: 0,
        max: 1,
        palette: ['#38bdf8']
      }, (floodMap, floodErr) => {
        if (floodErr) return res.status(500).json({ error: floodErr.message });
        cachedFloodTileUrl = floodMap.urlFormat;

        res.json({
          normalTileUrl: cachedNormalTileUrl,
          floodTileUrl: cachedFloodTileUrl,
          cached: false
        });
      });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.use('/api', (req, res) => res.status(404).json({ error: 'ไม่พบ API นี้ กรุณาเริ่มเซิร์ฟเวอร์รุ่นล่าสุด' }));

export default app;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const PORT = Number(process.env.PORT) || 5001;
  app.listen(PORT, () => {
    console.log(`🚀 GEE Backend Server running on http://localhost:${PORT}`);
  });
}
