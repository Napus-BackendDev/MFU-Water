import test from 'node:test';
import assert from 'node:assert/strict';
import { compressEvidencePhoto, createEvidenceForm, MAX_EVIDENCE_BYTES, MAX_SUBMISSION_BYTES } from './evidencePhotos.js';

const input = new Blob(['mock-image'], { type: 'image/png' });
function renderer(width, height, encode) {
  const draws = [];
  let closed = 0;
  const surface = { getContext: () => ({ fillRect() {}, drawImage(image, x, y, w, h) { draws.push([w, h]); } }),
    toBlob(callback, type, quality) { callback(encode(type, quality)); } };
  return { options: { decode: async () => ({ width, height, close() { closed++; } }), canvas: () => surface },
    draws, surface, closed: () => closed };
}
test('photo compression resizes without upscaling, encodes JPEG, closes decoder and releases canvas', async () => {
  const mock = renderer(4000, 2000, type => new Blob(['jpeg-fixture'], { type }));
  const blob = await compressEvidencePhoto(input, mock.options);
  assert.equal(blob.type, 'image/jpeg');
  assert.deepEqual(mock.draws, [[2048, 1024]]);
  assert.equal(mock.closed(), 1);
  assert.equal(mock.surface.width, 0);
  const small = renderer(100, 50, type => new Blob(['fixture'], { type }));
  await compressEvidencePhoto(input, small.options);
  assert.deepEqual(small.draws, [[100, 50]]);
});
test('compression retries quality then resolution; never returns oversized or failed encoding', async () => {
  let count = 0;
  const mock = renderer(4000, 2000, type => new Blob([new Uint8Array(++count <= 3 ? MAX_EVIDENCE_BYTES + 1 : 100)], { type }));
  const output = await compressEvidencePhoto(input, mock.options);
  assert.equal(count, 4);
  assert.ok(output.size <= MAX_EVIDENCE_BYTES);
  assert.deepEqual(mock.draws, [[2048, 1024], [1536, 768]]);
  for (const encode of [() => null, () => new Blob(['fallback'], { type: 'image/png' }), () => new Blob([new Uint8Array(MAX_EVIDENCE_BYTES + 1)], { type: 'image/jpeg' })]) {
    const fail = renderer(100, 50, encode);
    await assert.rejects(compressEvidencePhoto(input, fail.options), /ไม่สำเร็จ/);
    assert.equal(fail.closed(), 1);
  }
});
test('invalid images and input limits stop before submission; huge decoded image is released', async () => {
  await assert.rejects(compressEvidencePhoto(new Blob(['svg'], { type: 'image/svg+xml' })), /รองรับเฉพาะ/);
  await assert.rejects(compressEvidencePhoto(new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: 'image/jpeg' })), /10 MiB/);
  await assert.rejects(compressEvidencePhoto(input, { decode: async () => { throw new Error('decode failed'); } }), /decode failed/);
  const huge = renderer(10000, 10000, () => null);
  await assert.rejects(compressEvidencePhoto(input, huge.options), /ความละเอียด/);
  assert.equal(huge.closed(), 1);
});
test('two maximum-size photos and Thai fields fit multipart budget; filenames never expose original', async () => {
  const photos = [1, 2].map(() => new Blob([new Uint8Array(MAX_EVIDENCE_BYTES)], { type: 'image/jpeg' }));
  const form = await createEvidenceForm({ note: 'ข้อมูลจำลอง'.repeat(100) }, photos);
  const request = new Response(form);
  assert.ok((await request.arrayBuffer()).byteLength < MAX_SUBMISSION_BYTES);
  assert.deepEqual(form.getAll('photos').map(photo => photo.name), ['evidence.jpg', 'evidence.jpg']);
  await assert.rejects(createEvidenceForm({}, [...photos, photos[0]]), /2 รูป/);
  await assert.rejects(createEvidenceForm({ note: 'ก'.repeat(65536) }, []), /ข้อมูลผลตรวจ/);
  await assert.rejects(createEvidenceForm({}, [new Blob([new Uint8Array(MAX_EVIDENCE_BYTES + 1)], { type: 'image/jpeg' })]), /ลดขนาด/);
});
