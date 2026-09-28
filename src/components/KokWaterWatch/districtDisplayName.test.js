import test from 'node:test';
import assert from 'node:assert/strict';
import { districtDisplayName } from './boundaryThaiLabels.js';
import { districtLabelsForArea } from './provinceLabels.js';
import { QUICK_VIEW_AREAS } from './mapAreaNavigation.js';

test('district display removes only the administrative prefix', () => {
  assert.equal(districtDisplayName('อำเภอเมืองเชียงราย'), 'เมืองเชียงราย');
  assert.equal(districtDisplayName('อำเภอ แม่ลาว'), 'แม่ลาว');
  assert.equal(districtDisplayName('อําเภอเมืองเชียงใหม่'), 'เมืองเชียงใหม่');
  assert.equal(districtDisplayName('เขตบางรัก'), 'เขตบางรัก');
  assert.equal(districtDisplayName('เมืองเชียงราย'), 'เมืองเชียงราย');
  assert.equal(districtDisplayName(null), '');
  assert.ok(QUICK_VIEW_AREAS.every(area => !area.label.includes('อำเภอ')));
});

test('map label is shortened while official names, codes and geometry stay intact', () => {
  const feature = { properties: { nameTh: 'อำเภอเมืองเชียงราย', districtCode: 'TH5701', provinceCode: 'TH-57', labelPoint: [99.8, 19.9] }, geometry: { type: 'Polygon', coordinates: [] } };
  for (const level of ['province', 'district']) {
    const labels = districtLabelsForArea([feature], { level, provinceIso: 'TH-57', districtCode: 'TH5701' });
    assert.equal(labels[0].text, 'เมืองเชียงราย');
    assert.equal(labels[0].id, 'TH5701');
    assert.equal(labels[0].feature, feature);
    assert.equal(feature.properties.nameTh, 'อำเภอเมืองเชียงราย');
  }
});
