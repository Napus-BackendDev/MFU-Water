import { pointInGeometry } from './mapAreaNavigation.js';

export function filterSampleLevel(samples, level) {
  return samples.filter(sample => {
    const value = Number(sample.measurements?.arsenic?.value ?? sample.arsenic_ppb);
    return level === 'all' || !level || (level === 'critical' ? value > 10 : level === 'watch' ? value >= 5 && value <= 10 : value < 5);
  });
}

export function countPublishedByArea(samples, boundaries, districtCache = {}) {
  const published = samples.filter(sample => {
    const raw = sample.measurements?.arsenic?.value ?? sample.arsenic_ppb;
    const value = Number(raw);
    if (raw === null || raw === undefined || raw === '' || !Number.isFinite(value) || value < 0) return false;
    return sample.publication_status === 'auto_published' ? value <= 50
      : sample.publication_status === 'approved' && (!Object.hasOwn(sample, 'approved_revision') || sample.approved_revision === sample.revision);
  });
  const counts = {};
  const count = (features, id) => {
    if (!features) return;
    for (const feature of features) counts[id(feature)] = 0;
    for (const sample of published) {
      // One authoritative match per administrative level, never one count per cluster.
      const feature = features.find(f => pointInGeometry(sample.coordinates, f.geometry));
      if (feature) counts[id(feature)]++;
    }
  };
  count(boundaries.regions?.features, f => f.properties.regionId);
  count(boundaries.provinces?.features, f => f.properties.shapeISO);
  const districts = Object.values({ ...districtCache, ...(boundaries.districts?.features?.length ? { [boundaries.districts.features[0].properties.provinceCode]: boundaries.districts } : {}) });
  count(districts.flatMap(data => data.features), f => f.properties.districtCode);
  return counts;
}
