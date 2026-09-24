import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ee from '@google/earthengine';
import { analyzeGeeWater, parseGeeAnalysisQuery } from './geeWaterAnalysis.js';

const mode = process.argv[2] || 'mndwi';
const keyPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'service-account.json');
if (!fs.existsSync(keyPath)) throw new Error('Local GEE service account not found');
const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

await new Promise((resolve, reject) => {
  ee.data.authenticateViaPrivateKey(key, () => {
    ee.initialize(null, null, resolve, reject);
  }, reject);
});

const params = parseGeeAnalysisQuery({
  mode,
  bbox: '99.32,20.02,99.44,20.10',
  start: mode.startsWith('s1-') ? '2024-09-10' : '2024-08-20',
  end: '2024-09-25',
  baselineStart: '2024-08-01',
  baselineEnd: '2024-08-31',
  cloud: '90',
  threshold: '0.1'
});
const result = await analyzeGeeWater(ee, params);
console.log(JSON.stringify({
  mode: result.mode,
  hasTileUrl: Boolean(result.tileUrl),
  hasBaseTileUrl: Boolean(result.baseTileUrl),
  imageCount: result.provenance.imageCount,
  baselineImageCount: result.provenance.baselineImageCount,
  metrics: result.metrics,
  metricError: result.metricError
}));
