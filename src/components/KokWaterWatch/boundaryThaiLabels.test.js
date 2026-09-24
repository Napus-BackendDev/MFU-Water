import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { thaiBoundaryName, thaiBoundaryLabelExpression } from './boundaryThaiLabels.js';

const boundaryFiles = {
  country: 'thailand-adm0.geojson',
  province: 'chiangrai-region-adm1.geojson',
  locality: 'kok-region-adm2.geojson'
};

test('every local administrative feature has a Thai label', () => {
  for (const [level, filename] of Object.entries(boundaryFiles)) {
    const url = new URL(`../../../public/data/boundaries/${filename}`, import.meta.url);
    const collection = JSON.parse(readFileSync(url, 'utf8'));
    for (const feature of collection.features) {
      const label = thaiBoundaryName(level, feature.properties.shapeName);
      assert.match(label, /[ก-๙]/, `${level}: ${feature.properties.shapeName}`);
    }
    assert.equal(thaiBoundaryLabelExpression(level)[0], 'match');
  }
});
