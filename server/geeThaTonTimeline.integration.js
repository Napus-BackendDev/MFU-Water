import fs from 'node:fs';
import ee from '@google/earthengine';
import { compareThaTonFrames, getThaTonFrame, listThaTonFrames, THA_TON_PERIOD } from './geeThaTonTimeline.js';
import { selectDefaultPair } from '../src/utils/thaTonTimeline.js';

const keyPath = new URL('./service-account.json', import.meta.url);
if (!fs.existsSync(keyPath)) throw new Error('ไม่มี service-account.json สำหรับทดสอบ GEE');
const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

await new Promise((resolve, reject) => ee.data.authenticateViaPrivateKey(key, resolve, reject));
await new Promise((resolve, reject) => ee.initialize(null, null, resolve, reject));
const listing = await listThaTonFrames(ee);
if (!listing.frames.length) throw new Error('ไม่พบภาพจริงในช่วงที่กำหนด');
for (const frame of listing.frames) {
  const day = frame.acquiredAt.slice(0, 10);
  if (day < THA_TON_PERIOD.start || day > THA_TON_PERIOD.end) throw new Error(`วันที่ภาพอยู่นอกช่วง: ${day}`);
}
const results = [];
for (let index = 0; index < listing.frames.length; index += 1) {
  const frame = await getThaTonFrame(ee, index);
  if (!frame.tileUrl?.includes('{z}') || !frame.tileUrl?.includes('{x}') || !frame.tileUrl?.includes('{y}')) {
    throw new Error('GEE ไม่คืน URL ไทล์ที่ใช้กับ MapLibre ได้');
  }
  results.push({ date: frame.acquiredAt.slice(0, 10), orbit: frame.orbitPass, waterAreaKm2: frame.waterAreaKm2 });
}
const pair = selectDefaultPair(listing.frames);
if (!pair) throw new Error('ไม่มีคู่ภาพก่อน/หลังเหตุการณ์จากวงโคจรเดียวกัน');
const comparison = await compareThaTonFrames(ee, pair.beforeIndex, pair.afterIndex);
if (!comparison.addedTileUrl?.includes('{z}') || !comparison.recededTileUrl?.includes('{z}') ||
    !Number.isFinite(comparison.metrics?.addedKm2) || !Number.isFinite(comparison.metrics?.recededKm2)) {
  throw new Error('GEE ไม่คืนแผนที่หรือพื้นที่เปรียบเทียบครบ');
}
console.log(JSON.stringify({ frames: results, comparison: {
  beforeDate: comparison.before.acquiredAt.slice(0, 10),
  afterDate: comparison.after.acquiredAt.slice(0, 10),
  metrics: comparison.metrics
} }));
