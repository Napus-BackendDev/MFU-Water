import { regionForProvince } from './mapAreaNavigation.js';
const paths = { thailand: '/data/boundaries/thailand-navigation.geojson', countries: '/data/boundaries/se-asia-countries.geojson', provinces: '/data/boundaries/thailand-provinces.geojson' };
export function createBoundaryLoader(fetchImpl = fetch) {
  const requests = new Map();
  const load = key => {
    const districtCode = key.startsWith('districts:') ? key.slice(10) : null;
    const regionId = key.startsWith('provinces:') ? key.slice(10) : null;
    const path = districtCode && /^TH-\d{2}$/.test(districtCode)
      ? `/data/boundaries/districts/${districtCode}.geojson`
      : regionId && ['north', 'central', 'northeast', 'south'].includes(regionId)
        ? `/data/boundaries/regions/${regionId}-provinces.geojson`
        : key === 'regions' ? '/data/boundaries/thailand-regions.geojson' : paths[key];
    if (!path) return Promise.reject(new Error('Unknown boundary'));
    if (!requests.has(key)) {
      const compressed = key !== 'countries' && typeof DecompressionStream !== 'undefined';
      requests.set(key, fetchImpl(compressed ? `${path}.gz` : path).then(response => {
        if (!response.ok) throw new Error(`โหลดขอบเขต ${key} ไม่สำเร็จ`);
        // Fetch has already decoded servers (e.g. Vite) using Content-Encoding.
        if (compressed && response.body && !response.headers?.get('content-encoding')?.includes('gzip')) return new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();
        return response.json();
      }).then(async data => {
        if (regionId && (!data.features?.length || data.features.some(f => regionForProvince(f.properties?.shapeISO) !== regionId))) throw new Error('Province dataset does not match selected region');
        if (districtCode && (!data.features?.length || data.features.some(f => f.properties?.provinceCode !== districtCode || !f.properties?.districtCode || !f.properties?.nameTh))) {
          throw new Error('District dataset does not match selected province');
        }
        if (key === 'countries') {
          const thailand = await load('thailand');
          return { ...data, features: [...data.features.filter(f => f.properties.shapeISO !== 'THA'), ...thailand.features] };
        }
        return data;
      }).catch(error => { requests.delete(key); throw error; }));
    }
    return requests.get(key);
  };
  load.loadDistricts = provinceCode => load(`districts:${provinceCode}`);
  load.loadRegions = () => load('regions');
  load.loadProvinces = regionId => load(`provinces:${regionId}`);
  load.peekDistricts = provinceCode => requests.get(`districts:${provinceCode}`);
  return load;
}
export const loadBoundary = createBoundaryLoader();
export const loadDistricts = provinceCode => loadBoundary.loadDistricts(provinceCode);
export const loadRegions = () => loadBoundary.loadRegions();
export const loadProvinces = regionId => loadBoundary.loadProvinces(regionId);

// Quick View must pass through the same dependency chain; no deeper prefetch.
export async function loadAreaBoundaries(area, loader = loadBoundary) {
  const [countries, regions] = await Promise.all([loader('thailand'), loader.loadRegions()]);
  if (!['region', 'province', 'district'].includes(area.level)) return { countries, regions, provinces: null, districts: null };
  const provinces = await loader.loadProvinces(area.regionId);
  const districts = ['province', 'district'].includes(area.level) ? await loader.loadDistricts(area.provinceIso) : null;
  return { countries, regions, provinces, districts };
}
