import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import ee from '@google/earthengine';

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

// Initialize GEE with Service Account
if (fs.existsSync(keyPath)) {
  const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  geeClientEmail = key.client_email;

  ee.data.authenticateViaPrivateKey(
    key,
    () => {
      ee.initialize(
        null,
        null,
        () => {
          isGEEReady = true;
          console.log(`✅ Google Earth Engine connected with ${geeClientEmail}`);
        },
        (err) => console.error('GEE Initialize error:', err.message || err)
      );
    },
    (err) => console.error('GEE Auth error:', err.message || err)
  );
} else {
  console.warn('⚠️ service-account.json not found in server directory');
}

// 1. Health Status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    geeConnected: isGEEReady,
    engine: 'Google Earth Engine API',
    clientEmail: geeClientEmail ? geeClientEmail.replace(/(?<=.{4}).(?=.*@)/g, '*') : null
  });
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


const PORT = 5001;
app.listen(PORT, () => {
  console.log(`🚀 GEE Backend Server running on http://localhost:${PORT}`);
});
