import { THAI_PROVINCE_NAMES } from './boundaryThaiLabels.js';

const regions = [
  { id: 'north', label: 'ภาคเหนือ', provinceCodes: ['50','51','52','53','54','55','56','57','58','60','61','62','63','64','65','66','67'] },
  { id: 'central', label: 'ภาคกลาง', provinceCodes: ['10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','70','71','72','73','74','75','76','77'] },
  { id: 'northeast', label: 'ภาคอีสาน', provinceCodes: ['30','31','32','33','34','35','36','37','38','39','40','41','42','43','44','45','46','47','48','49'] },
  { id: 'south', label: 'ภาคใต้', provinceCodes: ['80','81','82','83','84','85','86','90','91','92','93','94','95','96'] }
];

export const THAI_REGIONS = regions.map(region => ({ ...region, provinceCodes: [...region.provinceCodes] }));

export const INITIAL_MAP_AREA = Object.freeze({ level: 'country', countryIso: 'THA' });

export function isSelectableCountry(countryIso) {
  return countryIso === 'THA';
}

export const COUNTRIES = [
  { iso: 'THA', name: 'ประเทศไทย' }, { iso: 'MMR', name: 'ประเทศเมียนมา' },
  { iso: 'LAO', name: 'ประเทศลาว' }, { iso: 'KHM', name: 'ประเทศกัมพูชา' },
  { iso: 'MYS', name: 'ประเทศมาเลเซีย' }, { iso: 'VNM', name: 'ประเทศเวียดนาม' }
];

export const SELECTABLE_COUNTRIES = COUNTRIES.filter(country => isSelectableCountry(country.iso));

export function shouldShowAreaSamples(area) {
  return ['region', 'province', 'district'].includes(area?.level);
}

export const QUICK_VIEW_AREAS = [
  { id: 'mae-lao', label: 'แม่ลาว', provinceLabel: 'จังหวัดเชียงราย', provinceIso: 'TH-57', districtCode: 'TH5716', districtName: 'Mae Lao' },
  { id: 'mueang-chiang-rai', label: 'เมืองเชียงราย', provinceLabel: 'จังหวัดเชียงราย', provinceIso: 'TH-57', districtCode: 'TH5701', districtName: 'Mueang Chiang Rai' }
];

export function regionForProvince(provinceIso) {
  const code = String(provinceIso || '').replace(/^TH-/, '');
  return THAI_REGIONS.find(region => region.provinceCodes.includes(code))?.id || null;
}

export function regionFillExpression() {
  return ['match', ['get', 'shapeISO'], ...THAI_REGIONS.flatMap(region =>
    region.provinceCodes.flatMap(code => [`TH-${code}`, region.id])
  ), 'central'];
}

export function provincesForRegion(regionId) {
  const region = THAI_REGIONS.find(item => item.id === regionId);
  if (!region) return [];
  return region.provinceCodes.map(code => {
    const iso = `TH-${code}`;
    return { iso, label: THAI_PROVINCE_NAMES[iso], regionId };
  }).filter(province => province.label);
}

export function provinceOutlineFilter(regionId) {
  const provinceIsos = provincesForRegion(regionId).map(province => province.iso);
  return provinceIsos.length
    ? ['in', ['get', 'shapeISO'], ['literal', provinceIsos]]
    : ['==', ['get', 'shapeISO'], ''];
}

const geometryBounds = new WeakMap();
function cachedBounds(geometry) {
  if (!geometryBounds.has(geometry)) geometryBounds.set(geometry, boundsForGeometry(geometry));
  return geometryBounds.get(geometry);
}
export function pointInGeometry(point, geometry) {
  if (!Array.isArray(point) || point.length < 2 || !geometry) return false;
  const [lng, lat] = point.map(Number);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return false;
  const bounds = cachedBounds(geometry);
  if (bounds && (lng < bounds[0][0] || lng > bounds[1][0] || lat < bounds[0][1] || lat > bounds[1][1])) return false;
  const inRing = ring => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]; const [xj, yj] = ring[j];
      if (((yi > lat) !== (yj > lat)) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const inPolygon = polygon => Array.isArray(polygon?.[0]) && inRing(polygon[0]) && !polygon.slice(1).some(inRing);
  if (geometry.type === 'Polygon') return inPolygon(geometry.coordinates);
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.some(inPolygon);
  return false;
}

const provinceLookups = new WeakMap();
export function provinceForCoordinates(point, features) {
  const provinceFeatures = Array.isArray(features) ? features : features?.features || [];
  let lookups = provinceLookups.get(provinceFeatures);
  if (!lookups) { lookups = new Map(); provinceLookups.set(provinceFeatures, lookups); }
  const key = `${point?.[0]},${point?.[1]}`;
  if (lookups.has(key)) return lookups.get(key);
  const feature = provinceFeatures.find(item =>
    item?.properties?.shapeISO?.startsWith('TH-') && pointInGeometry(point, item.geometry)
  );
  if (!feature) { if (lookups.size >= 10000) lookups.clear(); lookups.set(key, null); return null; }
  const iso = feature.properties.shapeISO;
  const name = THAI_PROVINCE_NAMES[iso];
  const result = name ? { iso, name } : null;
  // Bound memory while retaining the most recent viewport's coordinate lookups.
  if (lookups.size >= 10000) lookups.clear();
  lookups.set(key, result);
  return result;
}

export function filterSubmissionsByArea(submissions, feature) {
  const features = Array.isArray(feature) ? feature : feature ? [feature] : [];
  if (!features.some(item => item?.geometry)) return [];
  return (submissions || []).filter(sample => features.some(item => pointInGeometry(sample?.coordinates, item.geometry)));
}

export function boundsForGeometry(geometry) {
  if (geometry?.type === 'Feature') return boundsForGeometry(geometry.geometry);
  if (geometry?.type === 'FeatureCollection') return boundsForGeometry(geometry.features);
  if (Array.isArray(geometry)) {
    const bounds = geometry.map(item => boundsForGeometry(item?.geometry || item)).filter(Boolean);
    if (!bounds.length) return null;
    return [[Math.min(...bounds.map(item => item[0][0])), Math.min(...bounds.map(item => item[0][1]))], [Math.max(...bounds.map(item => item[1][0])), Math.max(...bounds.map(item => item[1][1]))]];
  }
  const bounds = [[Infinity, Infinity], [-Infinity, -Infinity]];
  const visit = value => {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]))) {
      bounds[0][0] = Math.min(bounds[0][0], Number(value[0]));
      bounds[0][1] = Math.min(bounds[0][1], Number(value[1]));
      bounds[1][0] = Math.max(bounds[1][0], Number(value[0]));
      bounds[1][1] = Math.max(bounds[1][1], Number(value[1]));
      return;
    }
    value.forEach(visit);
  };
  visit(geometry?.coordinates);
  return Number.isFinite(bounds[0][0]) ? bounds : null;
}
