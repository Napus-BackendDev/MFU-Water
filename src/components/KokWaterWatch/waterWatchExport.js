import { publicPseudonym } from '../../lib/publicPseudonym.js';
import { csvCell } from '../../lib/csvCell.js';
export const WATER_WATCH_EXPORT_HEADERS = [
  'รหัสตัวอย่าง (sample_code)',
  'ชื่อจุดตรวจ/พิกัด (location_name)',
  'ละติจูด (latitude)',
  'ลองจิจูด (longitude)',
  'วันเวลาที่เก็บ (collection_time)',
  'ผู้ส่งผลตรวจ',
  'แหล่งน้ำ (water_source)',
  'ลักษณะน้ำ (appearance)',
  'สารหนู_ppb (arsenic)',
  'จำนวนรูปถ่าย (photo_count)'
];

export function buildWaterWatchCSV(submissions) {
  const rows = (Array.isArray(submissions) ? submissions : []).filter(Boolean).map((sample) => [
    typeof sample.sample_code === 'object' && sample.sample_code !== null ? (sample.sample_code.code || sample.sample_code.id || '') : sample.sample_code,
    typeof sample.station_name === 'object' && sample.station_name !== null ? (sample.station_name.name || sample.station_name.th || '') : sample.station_name,
    sample.coordinates?.[1],
    sample.coordinates?.[0],
    sample.collection_time,
    publicPseudonym(sample.sample_code),
    sample.sample_nature?.water_source,
    sample.sample_nature?.water_appearance,
    sample.measurements?.arsenic?.value,
    sample.images?.length ?? 0
  ]);

  return '\uFEFF' + [
    WATER_WATCH_EXPORT_HEADERS.join(','),
    ...rows.map((row) => row.map(csvCell).join(','))
  ].join('\n');
}

export function downloadWaterWatchCSV(submissions, timeFilter, options = {}) {
  const documentRef = options.documentRef ?? document;
  const urlApi = options.urlApi ?? URL;
  const schedule = options.schedule ?? setTimeout;
  const date = options.date ?? new Date();
  const localDate = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
  const filename = `KOK_Water_Watch_${timeFilter}_${localDate}.csv`;
  const blob = new Blob([buildWaterWatchCSV(submissions)], { type: 'text/csv;charset=utf-8;' });
  const url = urlApi.createObjectURL(blob);
  const link = documentRef.createElement('a');

  try {
    link.href = url;
    link.download = filename;
    documentRef.body.appendChild(link);
    link.click();
    return filename;
  } finally {
    link.remove();
    schedule(() => urlApi.revokeObjectURL(url), 1000);
  }
}
