import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { THAI_PROVINCE_NAMES } from './boundaryThaiLabels.js';
import { THAI_REGIONS, pointInGeometry, provinceForCoordinates } from './mapAreaNavigation.js';
import { provinceLabelAnchor, provinceLabelsForArea } from './provinceLabels.js';

const root = new URL('../../../public/data/boundaries/', import.meta.url);
const data = JSON.parse(readFileSync(new URL('thailand-provinces.geojson', root)));
const source = JSON.parse(readFileSync(new URL('thailand-provinces.source.json', root)));

test('local provider manifest retains forest, water and original absolute tile URLs', () => {
  const style = JSON.parse(readFileSync(new URL('shortbread-colorful.style.json', root)));
  assert.equal(style.version, 8);
  for (const id of ['land-forest', 'land-grass', 'water-area', 'water-river', 'boundary-country:outline']) {
    assert.ok(style.layers.some(layer => layer.id === id), id);
  }
  assert.deepEqual(style.sources['versatiles-shortbread'].tiles, ['https://vector.openstreetmap.org/shortbread_v1/{z}/{x}/{y}.mvt']);
  assert.match(readFileSync(new URL('shortbread-colorful.LICENSE.txt', root), 'utf8'), /MIT License/);
});

test('full geometry retains pinned upstream coordinates and all 77 unique province codes', () => {
  assert.equal(data.features.length, 77);
  const codes = data.features.map(f => f.properties.shapeISO);
  assert.equal(new Set(codes).size, 77);
  assert.deepEqual([...codes].sort(), Object.keys(THAI_PROVINCE_NAMES).sort());
  assert.equal(createHash('sha256').update(JSON.stringify(data.features.map(f => f.geometry))).digest('hex'), source.geometrySha256);
  assert.equal(source.geometrySha256, '0c4d5bc38bbcc53775bcecb6d80183c7104da4b3fb602e3b478d460c0d59846c');
  assert.equal(source.licenseId, 'cc-by-igo');
  assert.deepEqual(source.topology, { overlappingAreas: 0, coverageDifferences: 0 });
  let vertices = 0;
  const visit = coordinates => {
    if (typeof coordinates[0] === 'number') {
      assert.ok(coordinates[0] >= 97 && coordinates[0] <= 106);
      assert.ok(coordinates[1] >= 5 && coordinates[1] <= 21);
      vertices++;
    } else coordinates.forEach(visit);
  };
  data.features.forEach(f => visit(f.geometry.coordinates));
  assert.ok(vertices > 140000, `Not full resolution: ${vertices}`);
});

test('each region gets every Thai HTML label inside its own canonical province', () => {
  for (const region of THAI_REGIONS) {
    const labels = provinceLabelsForArea(data.features, { level: 'region', regionId: region.id });
    assert.equal(labels.length, region.provinceCodes.length);
    for (const label of labels) {
      assert.equal(label.text, `จังหวัด${THAI_PROVINCE_NAMES[label.id]}`);
      assert.ok(pointInGeometry(label.coordinates, label.feature.geometry), label.text);
      assert.equal(provinceForCoordinates(label.coordinates, data.features).iso, label.id);
    }
  }
  assert.deepEqual(provinceLabelsForArea(data.features, { level: 'country', countryIso: 'THA' }), []);
  for (const level of ['province', 'district']) {
    const labels = provinceLabelsForArea(data.features, { level, provinceIso: 'TH-57' });
    assert.equal(labels.length, 0, 'Province names must not remain over district names');
  }
});

test('anchors handle concavity, holes, islands, cache reuse and invalid geometry', () => {
  const geometry = { type: 'MultiPolygon', coordinates: [
    [[[0,0],[4,0],[4,4],[0,4],[0,0]], [[1,1],[3,1],[3,3],[1,3],[1,1]]],
    [[[10,10],[11,10],[11,11],[10,11],[10,10]]]
  ] };
  const anchor = provinceLabelAnchor(geometry);
  assert.ok(pointInGeometry(anchor, geometry));
  assert.equal(provinceLabelAnchor(geometry), anchor);
  assert.equal(provinceLabelAnchor(null), null);
  assert.equal(provinceLabelAnchor({ type: 'Polygon', coordinates: [] }), null);
});
