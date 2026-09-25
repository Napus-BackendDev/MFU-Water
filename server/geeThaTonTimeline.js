import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const THA_TON_PERIOD = Object.freeze({ start: '2024-09-22', end: '2024-10-05', endExclusive: '2024-10-06' });
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

function scenes(ee) {
  const roi = thaTonGeometry(ee);
  const collection = ee.ImageCollection('COPERNICUS/S1_GRD')
    .filterBounds(roi)
    .filterDate(THA_TON_PERIOD.start, THA_TON_PERIOD.endExclusive)
    .filter(ee.Filter.eq('instrumentMode', 'IW'))
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
    .select('VV')
    .sort('system:time_start');
  return { roi, collection };
}

let cachedFrames = null;
const cachedTiles = new Map();

export async function listThaTonFrames(ee) {
  if (cachedFrames) return cachedFrames;
  const { collection } = scenes(ee);
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
  cachedFrames = { period: { start: THA_TON_PERIOD.start, end: THA_TON_PERIOD.end }, dataset: 'COPERNICUS/S1_GRD', orbit: 'BOTH', frames };
  return cachedFrames;
}

export async function getThaTonFrame(ee, index) {
  const listing = await listThaTonFrames(ee);
  if (!Number.isInteger(index) || index < 0 || index >= listing.frames.length) {
    throw Object.assign(new Error('ไม่พบฉากดาวเทียมที่เลือก'), { status: 404 });
  }
  if (cachedTiles.has(index)) return cachedTiles.get(index);
  const { roi, collection } = scenes(ee);
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
  cachedTiles.set(index, result);
  return result;
}
