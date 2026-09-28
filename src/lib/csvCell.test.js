import test from 'node:test';
import assert from 'node:assert/strict';
import { csvCell } from './csvCell.js';
test('CSV text formulas are neutralized while numeric data and quotes remain valid', () => {
  for (const value of ['=SUM(1,2)', '+1', '-1', '@cmd', '\t=1', ' \r=1']) assert.equal(csvCell(value), `"'${value}"`);
  assert.equal(csvCell(-1), '"-1"');
  assert.equal(csvCell('เชียงราย'), '"เชียงราย"');
  assert.equal(csvCell('a"b'), '"a""b"');
});
