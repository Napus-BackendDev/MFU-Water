import { publicPseudonym } from '../src/lib/publicPseudonym.js';
export const PUBLICATION_THRESHOLD_PPB = 50;

export function parseArsenicPpb(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value !== 'string' || !/^\+?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function publicationStatusFor(ppb) {
  const value = parseArsenicPpb(ppb);
  if (value === null) return 'pending_review';
  return value > PUBLICATION_THRESHOLD_PPB ? 'pending_review' : 'auto_published';
}

export function publicSampleDto(row) {
  const ppb = parseArsenicPpb(row?.arsenic_ppb ?? row?.measurements?.arsenic?.value);
  if (ppb === null || row?.publication_status === 'pending_review' || row?.publication_status === 'rejected' || row?.publication_status === 'withdrawn') return null;
  if (!['auto_published', 'approved'].includes(row?.publication_status)) return null;
  if (row.approved_revision !== row.revision) return null;
  if (row.publication_status === 'auto_published' && ppb > PUBLICATION_THRESHOLD_PPB) return null;

  const photoPaths = Array.isArray(row.private_photo_paths) ? row.private_photo_paths : [];
  return {
    sample_code: row.sample_code,
    station_id: row.station_id,
    station_name: row.station_name,
    coordinates: [row.longitude, row.latitude],
    collection_time: row.collection_time,
    gps_accuracy_meters: row.gps_accuracy_meters,
    entry_type: row.entry_type,
    sample_nature: {
      water_source: typeof row.sample_nature?.water_source === 'string' ? row.sample_nature.water_source : '',
      water_appearance: typeof row.sample_nature?.water_appearance === 'string' ? row.sample_nature.water_appearance : ''
    },
    measurements: {
      arsenic: { value: ppb, unit: 'ppb', status: ppb > 10 ? 'danger' : ppb >= 5 ? 'watch' : 'normal' }
    },
    images: photoPaths.map((_, index) => ({
      id: `${row.sample_code}-photo-${index + 1}`,
      title: `หลักฐานภาพที่ ${index + 1}`,
      url: `/api/samples/${encodeURIComponent(row.sample_code)}/photos/${index}`
    })),
    contributor_label: publicPseudonym(row.sample_code),
    publication_status: row.publication_status,
    revision: row.revision
  };
}

export function validateSampleInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'รูปแบบข้อมูลไม่ถูกต้อง';
  const arsenic = parseArsenicPpb(input.measurements?.arsenic?.value);
  if (arsenic === null || arsenic > 100000) return 'ค่า PPB ต้องเป็นตัวเลขตั้งแต่ 0 ถึง 100000';
  const [longitude, latitude] = input.coordinates || [];
  const validCoordinate = value => (typeof value === 'number' || (typeof value === 'string' && /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()))) && Number.isFinite(Number(value));
  if (!validCoordinate(latitude) || Number(latitude) < -90 || Number(latitude) > 90 || !validCoordinate(longitude) || Number(longitude) < -180 || Number(longitude) > 180) {
    return 'พิกัดไม่ถูกต้อง';
  }
  if (!input.collection_time || !Number.isFinite(Date.parse(input.collection_time))) return 'วันเวลาเก็บตัวอย่างไม่ถูกต้อง';
  if (input.collector && typeof input.collector !== 'object') return 'ข้อมูลติดต่อไม่ถูกต้อง';
  return null;
}
