import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { THAI_PROVINCE_NAMES, thaiBoundaryName } from './boundaryThaiLabels.js';
import { THAI_REGIONS, COUNTRIES, SELECTABLE_COUNTRIES, INITIAL_MAP_AREA, isSelectableCountry, QUICK_VIEW_AREAS, regionForProvince, provincesForRegion, provinceOutlineFilter, pointInGeometry, provinceForCoordinates, filterSubmissionsByArea, boundsForGeometry, shouldShowAreaSamples } from './mapAreaNavigation.js';

test('Thai regions partition all 77 provinces once', () => {
  const codes = THAI_REGIONS.flatMap(region => region.provinceCodes);
  assert.equal(codes.length, 77);
  assert.equal(new Set(codes).size, 77);
  assert.deepEqual(THAI_REGIONS.map(region => region.provinceCodes.length), [17, 26, 20, 14]);
  assert.equal(regionForProvince('TH-57'), 'north');
  const provinces = JSON.parse(readFileSync(new URL('../../../public/data/boundaries/thailand-provinces.geojson', import.meta.url)));
  assert.equal(provinces.features.length, 77);
  assert.deepEqual(new Set(provinces.features.map(feature => feature.properties.shapeISO)), new Set(codes.map(code => `TH-${code}`)));
  assert.equal(Object.keys(THAI_PROVINCE_NAMES).length, 77);
  for (const feature of provinces.features) assert.match(THAI_PROVINCE_NAMES[feature.properties.shapeISO] || '', /[ก-๙]/);
});

test('country and Chiang Rai district assets include all navigation choices', () => {
  assert.equal(COUNTRIES.length, 6);
  assert.deepEqual(SELECTABLE_COUNTRIES.map(country => country.iso), ['THA']);
  assert.deepEqual(INITIAL_MAP_AREA, { level: 'country', countryIso: 'THA' });
  assert.equal(isSelectableCountry('THA'), true);
  for (const country of COUNTRIES.filter(item => item.iso !== 'THA')) assert.equal(isSelectableCountry(country.iso), false);
  assert.equal(QUICK_VIEW_AREAS.length, 2);
  const districts = JSON.parse(readFileSync(new URL('../../../public/data/boundaries/districts/TH-57.geojson', import.meta.url)));
  assert.equal(districts.features.length, 18);
  for (const feature of districts.features) assert.match(thaiBoundaryName('locality', feature.properties.shapeName), /[ก-๙]/);
  for (const quickView of QUICK_VIEW_AREAS) assert(districts.features.some(feature => feature.properties.districtCode === quickView.districtCode && feature.properties.provinceCode === quickView.provinceIso));
  for (const region of THAI_REGIONS) assert.equal(provincesForRegion(region.id).length, region.provinceCodes.length);
});

test('sample markers stay hidden on country overview and appear after drilling into a region', () => {
  assert.equal(shouldShowAreaSamples({ level: 'world' }), false);
  assert.equal(shouldShowAreaSamples({ level: 'country', countryIso: 'THA' }), false);
  assert.equal(shouldShowAreaSamples({ level: 'region', regionId: 'north' }), true);
  assert.equal(shouldShowAreaSamples({ level: 'province', provinceIso: 'TH-57' }), true);
});

test('region outline filter contains exactly that region provinces', () => {
  const filter = provinceOutlineFilter('north');
  assert.deepEqual(filter, ['in', ['get', 'shapeISO'], ['literal', provincesForRegion('north').map(province => province.iso)]]);
  assert.equal(provincesForRegion('north').length, 17);
  assert.deepEqual(provinceOutlineFilter('unknown'), ['==', ['get', 'shapeISO'], '']);
});

test('point filtering respects polygon holes and multipolygons', () => {
  const geometry = { type: 'Polygon', coordinates: [
    [[0,0],[10,0],[10,10],[0,10],[0,0]],
    [[4,4],[6,4],[6,6],[4,6],[4,4]]
  ] };
  assert.equal(pointInGeometry([2,2], geometry), true);
  assert.equal(pointInGeometry([5,5], geometry), false);
  assert.equal(pointInGeometry([12,2], geometry), false);
  const multi = { type: 'MultiPolygon', coordinates: [[[[20,20],[21,20],[21,21],[20,21],[20,20]]]] };
  assert.equal(pointInGeometry([20.5,20.5], multi), true);
  assert.equal(filterSubmissionsByArea([{ coordinates: [2,2] }, { coordinates: [5,5] }], { geometry }).length, 1);
  assert.deepEqual(boundsForGeometry(multi), [[20,20],[21,21]]);
  assert.deepEqual(boundsForGeometry({ type: 'Feature', geometry: multi }), [[20,20],[21,21]]);
  assert.deepEqual(boundsForGeometry({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry }, { type: 'Feature', geometry: multi }] }), [[0,0],[21,21]]);
});

test('survey coordinates resolve to the Thai province containing their actual point', () => {
  const provinces = JSON.parse(readFileSync(new URL('../../../public/data/boundaries/thailand-provinces.geojson', import.meta.url), 'utf8'));
  assert.deepEqual(provinceForCoordinates([99.8325, 19.9072], provinces), { iso: 'TH-57', name: 'เชียงราย' });
  assert.deepEqual(provinceForCoordinates([98.9853, 18.7883], provinces), { iso: 'TH-50', name: 'เชียงใหม่' });
  assert.equal(provinceForCoordinates([90, 20], provinces), null);
});
