import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('mobile result overlay escapes the map stacking context without moving desktop markers', () => {
  const source = readFileSync(new URL('./WaterWatchMap.jsx', import.meta.url), 'utf8');
  const mobile = source.slice(source.indexOf('isMobile ? createPortal('), source.indexOf('className="absolute z-[90]'));
  assert.match(source, /import \{ createPortal \} from 'react-dom'/);
  assert.match(mobile, /fixed inset-0 z-\[160\]/);
  assert.match(mobile, /<PublicEvidencePhotos sample=\{popupHotspot.sample\}/);
  assert.match(mobile, /<\/div>, document\.body\s*\) : \(/);
  assert.match(source, /className="absolute z-\[90\]/);
  assert.match(source, /previewImage && createPortal\(/);
  assert.match(source, /fixed inset-0 z-\[200\]/);
});
