export const WATER_WATCH_EXPORT_HEADERS = [
  'รหัสตัวอย่าง (sample_code)',
  'ชื่อจุดตรวจ/พิกัด (location_name)',
  'ละติจูด (latitude)',
  'ลองจิจูด (longitude)',
  'วันเวลาที่เก็บ (collection_time)',
  'ผู้เก็บตัวอย่าง (collector_name)',
  'หน่วยงาน (organization)',
  'แหล่งน้ำ (water_source)',
  'ลักษณะน้ำ (appearance)',
  'สารหนู_ppb (arsenic)',
  'จำนวนรูปถ่าย (photo_count)',
  'ลิงก์ภาพถ่าย (photo_urls)'
];

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export function buildWaterWatchCSV(submissions) {
  const rows = submissions.map((sample) => [
    sample.sample_code,
    sample.station_name,
    sample.coordinates?.[1],
    sample.coordinates?.[0],
    sample.collection_time,
    sample.collector?.name,
    sample.collector?.organization,
    sample.sample_nature?.water_source,
    sample.sample_nature?.water_appearance,
    sample.measurements?.arsenic?.value,
    sample.images?.length ?? 0,
    (sample.images || []).map((image) => image.url || '').join(' | ')
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
