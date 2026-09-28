import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArsenicPpb, publicationStatusFor, publicSampleDto, validateSampleInput } from './waterWatchRules.js';

test('publication threshold includes exactly 50 ppb and holds values above it', () => {
  assert.equal(publicationStatusFor(49.999), 'auto_published');
  assert.equal(publicationStatusFor(50), 'auto_published');
  assert.equal(publicationStatusFor(50.001), 'pending_review');
  assert.equal(publicationStatusFor(100), 'pending_review');
});

test('invalid, missing, negative and malformed ppb values never auto-publish', () => {
  for (const value of [null, undefined, '', 'oops', '0x10', '-1', -0.01, Infinity, NaN, {}, ' ']) {
    assert.equal(parseArsenicPpb(value), null);
    assert.equal(publicationStatusFor(value), 'pending_review');
  }
});

test('public DTO only includes approved statuses and omits contacts, raw image paths, and free-form notes', () => {
  const base = {
    sample_code: 'KOK-1', latitude: 20, longitude: 99, revision: 3, approved_revision: 3,
    publication_status: 'approved', arsenic_ppb: 50, private_photo_paths: ['samples/secret-object.jpg'],
    collector: { name: 'private', phone: '0800000000' }, sample_nature: { water_source: 'แม่น้ำ', notes: 'private note' }
  };
  const publicSample = publicSampleDto(base);
  assert.match(publicSample.contributor_label, /[ก-๙]+-[0-9a-f]{6}$/);
  assert.equal(publicSample.contributor_label, publicSampleDto({ ...base, collector: { name: 'different', phone: 'different' } }).contributor_label);
  assert.deepEqual(publicSample.sample_nature, { water_source: 'แม่น้ำ', water_appearance: '' });
  assert.deepEqual(publicSample.images[0], {
    id: 'KOK-1-photo-1', title: 'หลักฐานภาพที่ 1', url: '/api/samples/KOK-1/photos/0'
  });
  assert.equal(JSON.stringify(publicSample).includes('private'), false);
  for (const status of ['pending_review', 'rejected', 'withdrawn']) {
    assert.equal(publicSampleDto({ ...base, publication_status: status }), null);
  }
  assert.equal(publicSampleDto({ ...base, publication_status: 'approved', approved_revision: 2, revision: 3 }), null);
});

test('sample input validates ppb, coordinate ranges, and collection time', () => {
  const valid = { coordinates: [99.8, 20.1], collection_time: '2026-09-28T00:00:00Z', measurements: { arsenic: { value: 50 } } };
  assert.equal(validateSampleInput(valid), null);
  assert.match(validateSampleInput({ ...valid, measurements: { arsenic: { value: 'spoof' } } }), /PPB/);
  assert.match(validateSampleInput({ ...valid, coordinates: [200, 20] }), /พิกัด/);
  assert.match(validateSampleInput({ ...valid, coordinates: ['', ''] }), /พิกัด/);
  assert.match(validateSampleInput({ ...valid, collection_time: 'not-a-date' }), /วันเวลา/);
});
