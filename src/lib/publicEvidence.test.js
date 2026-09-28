import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evidencePhotos } from './publicEvidence.js';
import { normalizeSubmission } from '../data/waterWatchData.js';

test('evidence uses only this record publication-checked API, with no placeholder', () => {
  assert.deepEqual(evidencePhotos(null), []);
  const sample = { sample_code: 'KOK-1', images: [
    { url: '/api/samples/KOK-1/photos/0' },
    { url: '/api/samples/KOK-2/photos/0' },
    { url: 'https://example.com/storage/v1/object/public/photo.jpg' },
    { url: '/api/samples/KOK-1/photos/0/../../private' },
  ] };
  assert.deepEqual(evidencePhotos(sample), [sample.images[0]]);
  assert.deepEqual(normalizeSubmission({ sample_code: 'TEST', coordinates: [99,20], measurements: { arsenic: { value: 5 } } }).images, []);
});

test('popup and detail reuse aliases and evidence; retries and lazy loading present', () => {
  const map = readFileSync(new URL('../components/KokWaterWatch/WaterWatchMap.jsx', import.meta.url), 'utf8');
  assert.equal((map.match(/<PublicEvidencePhotos sample=\{popupHotspot.sample\}/g) || []).length, 2);
  assert.equal((map.match(/publicPseudonym\(popupHotspot.latestSampleCode\)/g) || []).length, 2);
  assert.ok(!map.includes('ที่มา: ผู้ไม่เปิดเผยชื่อ'));
  const detail = readFileSync(new URL('../components/KokWaterWatch/WaterWatchSampleDetail.jsx', import.meta.url), 'utf8');
  assert.ok(detail.includes('publicPseudonym(sample.sample_code)'));
  assert.ok(!detail.includes('images.unsplash.com'));
  const photos = readFileSync(new URL('../components/KokWaterWatch/PublicEvidencePhotos.jsx', import.meta.url), 'utf8');
  assert.ok(photos.includes('loading="lazy"'));
  assert.ok(photos.includes('onError='));
  assert.ok(photos.includes('ลองโหลดรูปอีกครั้ง'));
  const view = readFileSync(new URL('../components/KokWaterWatch/KokWaterWatchView.jsx', import.meta.url), 'utf8');
  assert.ok(view.includes('publicPseudonym(sub.sample_code)'));
  assert.ok(!view.includes('publicPseudonym(sample.sample_code)'));
});
