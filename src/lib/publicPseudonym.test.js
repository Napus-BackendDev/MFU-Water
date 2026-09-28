import test from 'node:test';
import assert from 'node:assert/strict';
import { publicPseudonym } from './publicPseudonym.js';

test('public alias is stable per record, varied across records and independent of contacts', () => {
  assert.equal(publicPseudonym('KOK-1'), publicPseudonym('KOK-1'));
  const names = new Set(Array.from({ length: 1000 }, (_, i) => publicPseudonym(`KOK-${i}`)));
  assert.equal(names.size, 1000);
  assert.match(publicPseudonym('KOK-1'), /[ก-๙]+-[0-9a-f]{6}$/);
  assert.equal(publicPseudonym({ collector: { name: 'private', phone: 'private' } }), 'ผู้ไม่เปิดเผยชื่อ');
  assert.equal(publicPseudonym(null), 'ผู้ไม่เปิดเผยชื่อ');
});
