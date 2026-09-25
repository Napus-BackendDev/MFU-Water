import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const THA_TON_PERIOD = Object.freeze({ start: '2024-09-05', end: '2024-10-05' });
const boundaryPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/data/boundaries/tha-ton-adm3.geojson');
// DPM MapDX official subdistrict boundary, TAM_CODE 501005:
// https://gis-portal.disaster.go.th/arcgis/rest/services/MapDX/DPM_TH_Boundary/FeatureServer/3
const boundary = JSON.parse(fs.readFileSync(boundaryPath, 'utf8')).features[0];

if (String(boundary?.properties?.TAM_CODE) !== '501005' || boundary?.geometry?.type !== 'Polygon') {
  throw new Error('ขอบเขตตำบลท่าตอนไม่ถูกต้อง');
}

export function thaTonGeometry(ee) {
  return ee.Geometry.Polygon(boundary.geometry.coordinates);
}

const evaluate = (object) => new Promise((resolve, reject) => {
  object.evaluate((value, error) => error ? reject(new Error(String(error))) : resolve(value));
});

const getMap = (image, visualization) => new Promise((resolve, reject) => {
  image.getMapId(visualization, (map, error) => {
    if (error) reject(new Error(String(error)));
    else if (!map?.urlFormat) reject(new Error('GEE ไม่คืนชั้นภาพ'));
    else resolve(map.urlFormat);
  });
});

function parseDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) throw new Error(`${label} ต้องเป็น YYYY-MM-DD`);
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error(`${label} ไม่ถูกต้อง`);
  return date;
}

export function parseThaTonPeriod(query = {}) {
  const start = String(query.start || THA_TON_PERIOD.start);
  const end = String(query.end || THA_TON_PERIOD.end);
  const first = parseDate(start, 'วันเริ่ม');
  const last = parseDate(end, 'วันสิ้นสุด');
  const days = (last - first) / 86400000;
  if (start < '2024-01-01' || end > '2024-12-31' || days < 1 || days > 45) {
    throw new Error('เลือกช่วง 2–46 วันภายในปี 2024');
  }
  return { start, end, endExclusive: new Date(last.getTime() + 86400000).toISOString().slice(0, 10) };
}

function scenes(ee, period) {
  const roi = thaTonGeometry(ee);
  const collection = ee.ImageCollection('COPERNICUS/S1_GRD')
    .filterBounds(roi)
    .filterDate(period.start, period.endExclusive)
    .filter(ee.Filter.eq('instrumentMode', 'IW'))
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
    .select('VV')
    .sort('system:time_start');
  return { roi, collection };
}

const cachedFrames = new Map();
const cachedTiles = new Map();
const cachedComparisons = new Map();

function periodKey(period) { return `${period.start}:${period.end}`; }

export async function listThaTonFrames(ee, period = parseThaTonPeriod()) {
  const key = periodKey(period);
  if (cachedFrames.has(key)) return cachedFrames.get(key);
  const { collection } = scenes(ee, period);
  const data = await evaluate(ee.Dictionary({
    ids: collection.aggregate_array('system:index'),
    times: collection.aggregate_array('system:time_start'),
    orbits: collection.aggregate_array('relativeOrbitNumber_start'),
    passes: collection.aggregate_array('orbitProperties_pass')
  }));
  const frames = (data.ids || []).map((id, index) => ({
    index,
    id,
    acquiredAt: new Date(data.times[index]).toISOString(),
    relativeOrbit: data.orbits[index] ?? null,
    orbitPass: data.passes[index] ?? null
  }));
  const result = { period: { start: period.start, end: period.end }, dataset: 'COPERNICUS/S1_GRD', orbit: 'BOTH', frames };
  cachedFrames.set(key, result);
  return result;
}

export async function getThaTonFrame(ee, index, period = parseThaTonPeriod()) {
  const listing = await listThaTonFrames(ee, period);
  if (!Number.isInteger(index) || index < 0 || index >= listing.frames.length) {
    throw Object.assign(new Error('ไม่พบฉากดาวเทียมที่เลือก'), { status: 404 });
  }
  const key = `${periodKey(period)}:${index}`;
  if (cachedTiles.has(key)) return cachedTiles.get(key);
  const { roi, collection } = scenes(ee, period);
  const image = ee.Image(collection.toList(listing.frames.length).get(index));
  const baseTileUrl = await getMap(image.select('VV').clip(roi), { min: -25, max: 0, palette: ['#0f172a', '#64748b', '#f8fafc'] });
  const water = image.select('VV').lt(-17).selfMask().clip(roi);
  const tileUrl = await getMap(water, { min: 0, max: 1, palette: ['#22d3ee'] });
  let waterAreaKm2 = null;
  let metricError = null;
  try {
    const area = ee.Image.pixelArea().updateMask(water).rename('waterArea');
    const metric = await evaluate(area.reduceRegion({
      reducer: ee.Reducer.sum(), geometry: roi, scale: 30,
      bestEffort: true, maxPixels: 1e8, tileScale: 2
    }));
    if (Number.isFinite(metric?.waterArea)) waterAreaKm2 = Number((metric.waterArea / 1e6).toFixed(3));
  } catch {
    metricError = 'คำนวณพื้นที่ผิวน้ำไม่ได้';
  }
  const result = {
    ...listing.frames[index], tileUrl, baseTileUrl, waterAreaKm2, metricError,
    method: 'Sentinel-1 VV < -17 dB; พื้นที่ผิวน้ำที่อาจตรวจพบ ไม่ใช่ความสูงน้ำ; เงาภูเขาอาจทำให้คลาดเคลื่อน'
  };
  cachedTiles.set(key, result);
  return result;
}

export function validateThaTonPair(frames, beforeIndex, afterIndex) {
  if (!Number.isInteger(beforeIndex) || !Number.isInteger(afterIndex) ||
      beforeIndex < 0 || afterIndex >= frames.length || beforeIndex >= afterIndex) {
    throw Object.assign(new Error('เลือกภาพก่อนและหลังตามลำดับเวลาจริง'), { status: 400 });
  }
  const before = frames[beforeIndex];
  const after = frames[afterIndex];
  if (!before?.orbitPass || !Number.isFinite(Number(before.relativeOrbit)) ||
      before.orbitPass !== after?.orbitPass || Number(before.relativeOrbit) !== Number(after.relativeOrbit)) {
    throw Object.assign(new Error('ภาพ Before–After ต้องเป็นวงโคจรและทิศทางเดียวกัน'), { status: 400 });
  }
  return { before, after };
}

export async function compareThaTonFrames(ee, beforeIndex, afterIndex, period = parseThaTonPeriod()) {
  const listing = await listThaTonFrames(ee, period);
  validateThaTonPair(listing.frames, beforeIndex, afterIndex);
  const key = `${periodKey(period)}:${beforeIndex}:${afterIndex}`;
  if (cachedComparisons.has(key)) return cachedComparisons.get(key);
  const { roi, collection } = scenes(ee, period);
  const images = collection.toList(listing.frames.length);
  const beforeVV = ee.Image(images.get(beforeIndex)).select('VV');
  const afterVV = ee.Image(images.get(afterIndex)).select('VV');
  const observed = beforeVV.mask().and(afterVV.mask());
  const beforeWater = beforeVV.lt(-17).and(observed);
  const afterWater = afterVV.lt(-17).and(observed);
  const added = afterWater.and(beforeWater.not()).selfMask().clip(roi);
  const receded = beforeWater.and(afterWater.not()).selfMask().clip(roi);
  const [beforeFrame, afterFrame, addedTileUrl, recededTileUrl] = await Promise.all([
    getThaTonFrame(ee, beforeIndex, period), getThaTonFrame(ee, afterIndex, period),
    getMap(added, { min: 0, max: 1, palette: ['#fb923c'] }),
    getMap(receded, { min: 0, max: 1, palette: ['#a3e635'] })
  ]);
  const area = ee.Image.pixelArea();
  const bands = area.updateMask(added).rename('added')
    .addBands(area.updateMask(receded).rename('receded'))
    .addBands(area.updateMask(observed).rename('observed'));
  let metrics = null;
  let metricError = null;
  try {
    const values = await evaluate(bands.reduceRegion({
      reducer: ee.Reducer.sum(), geometry: roi, scale: 30,
      bestEffort: true, maxPixels: 1e8, tileScale: 2
    }));
    metrics = {
      addedKm2: Number(((values?.added || 0) / 1e6).toFixed(3)),
      recededKm2: Number(((values?.receded || 0) / 1e6).toFixed(3)),
      observedKm2: Number(((values?.observed || 0) / 1e6).toFixed(3))
    };
  } catch {
    metricError = 'คำนวณพื้นที่เปลี่ยนแปลงไม่ได้ แต่แสดงชั้นภาพได้';
  }
  const result = {
    period: listing.period, before: beforeFrame, after: afterFrame,
    addedTileUrl, recededTileUrl, metrics, metricError,
    method: 'Sentinel-1 VV < -17 dB; เปรียบเทียบเฉพาะพิกเซลที่ทั้งสองภาพสังเกตได้ และวงโคจรเดียวกัน',
    limitation: 'สีส้มเป็นพื้นที่เข้าข่ายน้ำเพิ่ม สีเขียวเป็นพื้นที่เข้าข่ายน้ำลด ไม่ใช่ความลึกน้ำหรือระดับน้ำ; เงาภูเขาและสิ่งกีดขวางอาจคลาดเคลื่อน'
  };
  cachedComparisons.set(key, result);
  return result;
}
