import { THAI_PROVINCE_NAMES, districtDisplayName } from './boundaryThaiLabels.js';
import { boundsForGeometry, pointInGeometry, regionForProvince } from './mapAreaNavigation.js';

const anchors = new WeakMap();

// Find the widest interior horizontal interval. Unlike a bounding-box centroid,
// this stays on land inside concave polygons, excludes holes and handles islands.
export function provinceLabelAnchor(geometry) {
  if (!geometry) return null;
  if (anchors.has(geometry)) return anchors.get(geometry);
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates]
    : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  let best = null;
  let bestWidth = -1;
  for (const polygon of polygons) {
    const bounds = boundsForGeometry({ type: 'Polygon', coordinates: polygon });
    if (!bounds) continue;
    for (let row = 1; row < 32; row++) {
      const y = bounds[0][1] + (bounds[1][1] - bounds[0][1]) * row / 32;
      const crossings = [];
      for (const ring of polygon) {
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const [x1, y1] = ring[j]; const [x2, y2] = ring[i];
          if ((y1 > y) !== (y2 > y)) crossings.push(x1 + (y - y1) * (x2 - x1) / (y2 - y1));
        }
      }
      crossings.sort((a, b) => a - b);
      for (let i = 0; i + 1 < crossings.length; i += 2) {
        const width = crossings[i + 1] - crossings[i];
        const point = [(crossings[i] + crossings[i + 1]) / 2, y];
        if (width > bestWidth && pointInGeometry(point, geometry)) { best = point; bestWidth = width; }
      }
    }
  }
  anchors.set(geometry, best);
  return best;
}

export function provinceLabelsForArea(features, area) {
  if (area?.level !== 'region') return [];
  return (features || []).filter(feature => regionForProvince(feature.properties?.shapeISO) === area.regionId).flatMap(feature => {
    const iso = feature.properties?.shapeISO;
    const coordinates = feature.properties.labelPoint || provinceLabelAnchor(feature.geometry);
    return coordinates && THAI_PROVINCE_NAMES[iso]
      ? [{ id: iso, text: `จังหวัด${THAI_PROVINCE_NAMES[iso]}`, coordinates, kind: 'province', feature }]
      : [];
  });
}

export function districtLabelsForArea(features, area) {
  if (!['province', 'district'].includes(area?.level)) return [];
  return (features || []).filter(feature => feature.properties?.provinceCode === area.provinceIso
    && (area.level !== 'district' || feature.properties.districtCode === area.districtCode)).flatMap(feature => {
    const coordinates = feature.properties.labelPoint || provinceLabelAnchor(feature.geometry);
    return coordinates && feature.properties.nameTh
      ? [{ id: feature.properties.districtCode, text: districtDisplayName(feature.properties.nameTh), coordinates, kind: 'district', feature }]
      : [];
  });
}
