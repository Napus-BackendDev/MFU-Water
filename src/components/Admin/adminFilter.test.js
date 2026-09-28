import test from 'node:test';
import assert from 'node:assert/strict';
import { filterAdminSubmissions } from './adminFilter.js';

const samples = [
  { sample_code: 'KOK-001', station_name: 'ท่าตอน', publication_status: 'pending_review', measurements: { arsenic: { value: 51 } }, images: [] },
  { sample_code: 'KOK-002', station_name: 'แม่อาย', publication_status: 'approved', measurements: { arsenic: { value: 10 } }, images: [{ url: '/private' }] }
];

test('admin filters workflow status and existing ppb/photo filters', () => {
  assert.deepEqual(filterAdminSubmissions(samples, { reviewStatus: 'pending_review' }).map(row => row.sample_code), ['KOK-001']);
  assert.deepEqual(filterAdminSubmissions(samples, { statusFilter: 'watch' }).map(row => row.sample_code), ['KOK-002']);
  assert.deepEqual(filterAdminSubmissions(samples, { photoFilter: 'with-photo' }).map(row => row.sample_code), ['KOK-002']);
});

test('admin search never matches contact fields even if an unexpected client object contains them', () => {
  const rowWithUnexpectedContact = { ...samples[0], collector: { name: 'Private Name', phone: '0890000000' } };
  assert.deepEqual(filterAdminSubmissions([rowWithUnexpectedContact], { searchQuery: 'Private Name' }), []);
  assert.deepEqual(filterAdminSubmissions([rowWithUnexpectedContact], { searchQuery: '0890000000' }), []);
  assert.deepEqual(filterAdminSubmissions([rowWithUnexpectedContact], { searchQuery: 'KOK-001' }).length, 1);
});
