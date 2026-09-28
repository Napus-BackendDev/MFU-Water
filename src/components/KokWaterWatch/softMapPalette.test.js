import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applySoftMapPalette, applyNaturalFeatureVisibility } from './softMapPalette.js';

test('imagery hides natural overlays, street restores them, boundaries and Kok river remain untouched', () => {
  const layers = [
    { id: 'land-forest', source: 'versatiles-shortbread' },
    { id: 'water-area', source: 'versatiles-shortbread' },
    { id: 'water-stream', source: 'versatiles-shortbread', layout: { visibility: 'none' } },
    { id: 'boundary-country', source: 'versatiles-shortbread' },
    { id: 'kok-river-route-line', source: 'kok-river-route' },
    { id: 'bnd-locality-layer', source: 'bnd-locality-src' }
  ];
  const writes = [];
  const map = { getStyle: () => ({ layers }), setLayoutProperty: (id, property, value) => {
    writes.push([id, property, value]);
    const layer = layers.find(layer => layer.id === id);
    layer.layout = { ...layer.layout, [property]: value };
  } };
  for (const mode of ['satellite', 'terrain']) {
    applyNaturalFeatureVisibility(map, mode);
    assert.ok(layers.slice(0, 3).every(layer => layer.layout.visibility === 'none'));
    applyNaturalFeatureVisibility(map, 'street');
    assert.equal(layers[0].layout.visibility, 'visible');
    assert.equal(layers[1].layout.visibility, 'visible');
    assert.equal(layers[2].layout.visibility, 'none');
  }
  assert.ok(writes.every(([id, property]) => /^(land-|water-)/.test(id) && property === 'visibility'));
  assert.ok(layers.slice(3).every(layer => !layer.layout));
});

test('soft palette preserves geometry, widths, labels and administrative boundaries', () => {
  const style = JSON.parse(readFileSync(new URL('../../../public/data/boundaries/shortbread-colorful.style.json', import.meta.url)));
  const original = JSON.stringify(style);
  const writes = [];
  applySoftMapPalette({ getStyle: () => style, setPaintProperty: (...args) => writes.push(args) });
  assert.equal(JSON.stringify(style), original);
  assert.ok(writes.some(([id, property, color]) => id === 'land-forest' && property === 'fill-color' && color === '#e2ecdd'));
  assert.ok(writes.some(([id, , color]) => id === 'water-ocean' && color === '#e0edf4'));
  assert.ok(writes.every(([id, property]) => !id.startsWith('boundary-') && !property.includes('width') && !property.startsWith('text-')));
  const fills = style.layers.filter(layer => layer.type === 'fill');
  assert.equal(writes.filter(([, property]) => property === 'fill-color').length, fills.length);
});

test('imagery and foreground overlays are never softened', () => {
  const writes = [];
  applySoftMapPalette({ getStyle: () => ({ layers: [
    { id: 'google-satellite-no-labels-layer', type: 'raster' },
    { id: 'google-terrain-layer', type: 'raster' },
    { id: 'gee-result', type: 'raster' }, { id: 'thai-label', type: 'symbol' },
    { id: 'province-fill', type: 'fill', source: 'provinces' },
    { id: 'survey-risk', type: 'fill', source: 'samples' },
    { id: 'kok-river-route', type: 'line', source: 'kok-river-route' },
  ] }), setPaintProperty: (...args) => writes.push(args) });
  assert.deepEqual(writes, []);
});

test('street to imagery to street restores paint without changing geometry or opacity', () => {
  const style = JSON.parse(readFileSync(new URL('../../../public/data/boundaries/shortbread-colorful.style.json', import.meta.url)));
  const initial = structuredClone(style);
  const map = {
    getStyle: () => style,
    setPaintProperty: (id, property, value) => {
      const layer = style.layers.find(layer => layer.id === id);
      layer.paint ||= {};
      if (value === null) delete layer.paint[property];
      else layer.paint[property] = value;
    },
  };
  for (const mode of ['satellite', 'terrain']) {
    applySoftMapPalette(map, 'street');
    assert.equal(style.layers.find(layer => layer.id === 'land-forest').paint['fill-color'], '#e2ecdd');
    applySoftMapPalette(map, mode);
    assert.deepEqual(style, initial);
  }
  applySoftMapPalette(map, 'street');
  assert.equal(style.layers.find(layer => layer.id === 'land-forest').paint['fill-color'], '#e2ecdd');
});
