import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import express from 'express';
import { createServer } from 'node:http';
import { createWaterWatchApi } from './waterWatchApi.js';
import { encodeEvidenceImage, MAX_EVIDENCE_OUTPUT_BYTES } from './evidenceImages.js';

test('actual server codec bounds noisy legacy image and strips metadata, preserving aspect ratio', async () => {
  const width = 2500, height = 1700;
  const pixels = Buffer.alloc(width * height * 3);
  let seed = 17;
  for (let i = 0; i < pixels.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; pixels[i] = seed >>> 24; }
  const source = await sharp(pixels, { raw: { width, height, channels: 3 } }).jpeg({ quality: 100 }).withMetadata().toBuffer();
  assert.ok(source.length > MAX_EVIDENCE_OUTPUT_BYTES);
  const output = await encodeEvidenceImage(source);
  const metadata = await sharp(output).metadata();
  assert.ok(output.length <= MAX_EVIDENCE_OUTPUT_BYTES);
  assert.ok(metadata.width <= 2048 && metadata.height <= 2048);
  assert.ok(Math.abs(metadata.width / metadata.height - width / height) < 0.002);
  assert.equal(metadata.format, 'jpeg');
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.icc, undefined);
});

test('small transparent PNG becomes white JPEG without enlargement; EXIF orientation rotates', async () => {
  const png = await sharp({ create: { width: 100, height: 50, channels: 4, background: '#00000000' } }).png().toBuffer();
  const output = await encodeEvidenceImage(png);
  const { data, info } = await sharp(output).raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 100); assert.equal(info.height, 50);
  assert.ok(data[0] > 245 && data[1] > 245 && data[2] > 245);
  const rotated = await sharp({ create: { width: 100, height: 50, channels: 3, background: '#ff0000' } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const metadata = await sharp(await encodeEvidenceImage(rotated)).metadata();
  assert.equal(metadata.width, 50); assert.equal(metadata.height, 100);
  assert.equal(metadata.orientation, undefined);
});

test('invalid, empty, oversized, SVG and excessive-pixel evidence fail closed', async () => {
  for (const input of [Buffer.alloc(0), Buffer.alloc(10 * 1024 * 1024 + 1)]) {
    await assert.rejects(encodeEvidenceImage(input), { status: 413 });
  }
  await assert.rejects(encodeEvidenceImage(Buffer.from('corrupt jpeg')), { status: 415 });
  await assert.rejects(encodeEvidenceImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>')), { status: 415 });
  const huge = await sharp({ create: { width: 6000, height: 6000, channels: 3, background: '#ffffff' } }).png().toBuffer();
  await assert.rejects(encodeEvidenceImage(huge), { status: 415 });
});

test('API upload and legacy download both use bounded codec, without Storage URL exposure', async () => {
  const source = await readFile(new URL('./waterWatchApi.js', import.meta.url), 'utf8');
  assert.match(source, /const cleanImage = await encodeEvidenceImage\(file\.buffer\)/);
  assert.match(source, /encodeEvidenceImage\(Buffer\.from\(await blob\.arrayBuffer\(\)\)\)/);
  assert.match(source, /!adminOnly && !publicSampleDto\(row\)/);
  assert.match(source, /requireAdmin, servePhoto\(true\)/);
  assert.doesNotMatch(source, /createSignedUrl|getPublicUrl/);
});

test('real public photo route rechecks publication before Storage access, returns bounded JPEG/no-store', async t => {
  let row = { sample_code: 'MOCK-1', latitude: 20, longitude: 99, revision: 1, approved_revision: 1,
    publication_status: 'auto_published', arsenic_ppb: 50, private_photo_paths: ['samples/mock.png'] };
  let downloads = 0;
  let image = await sharp({ create: { width: 100, height: 50, channels: 3, background: '#ffffff' } }).png().toBuffer();
  const query = { select() { return this; }, eq() { return this; }, in() { return this; },
    async maybeSingle() { return { data: row, error: null }; } };
  const clients = { service: { from: () => query, storage: { from: () => ({ async download() {
    downloads++; return { data: new Blob([image], { type: 'image/png' }), error: null };
  } }) } } };
  const app = express();
  app.use('/api', createWaterWatchApi({ startWorker: false, publicReadOnly: true, getPublicClients: () => clients }));
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const url = `http://127.0.0.1:${server.address().port}/api/samples/MOCK-1/photos/0`;
  async function request(expected, method = 'GET') {
    const response = await fetch(url, { method, signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, expected);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    return response;
  }
  const success = await request(200);
  assert.equal(success.headers.get('content-type'), 'image/jpeg');
  assert.equal(success.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await sharp(Buffer.from(await success.arrayBuffer())).metadata()).format, 'jpeg');
  await request(200, 'HEAD');
  const before = downloads;
  for (const status of ['pending_review', 'rejected', 'withdrawn']) {
    row = { ...row, publication_status: status }; await request(404);
  }
  row = { ...row, publication_status: 'approved', approved_revision: 0 }; await request(404);
  row = { ...row, publication_status: 'auto_published', approved_revision: 1, arsenic_ppb: 100 }; await request(404);
  assert.equal(downloads, before, 'unpublished or stale revision must not download');
  row = { ...row, publication_status: 'approved' }; await request(200);
  row = { ...row, publication_status: 'withdrawn' }; await request(404);
  row = { ...row, publication_status: 'approved' }; image = Buffer.from('invalid image');
  await request(415);
});
