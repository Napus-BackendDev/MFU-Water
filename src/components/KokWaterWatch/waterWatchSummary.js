const dayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

function bangkokDayKey(timestamp) {
  const parts = Object.fromEntries(dayFormatter.formatToParts(timestamp).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getArsenicPpb(record) {
  const raw = record?.measurements?.arsenic?.value ?? record?.arsenic_ppb ?? record?.arsenic_level_ppb;
  if (raw === null || raw === undefined || String(raw).trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function emptyCounts() {
  return { total: 0, measured: 0, critical: 0, watch: 0, normal: 0, unknown: 0, sum: 0, min: null, max: null };
}

function addRecord(counts, value) {
  counts.total += 1;
  if (value === null) {
    counts.unknown += 1;
    return;
  }
  counts.measured += 1;
  counts.sum += value;
  counts.min = counts.min === null ? value : Math.min(counts.min, value);
  counts.max = counts.max === null ? value : Math.max(counts.max, value);
  if (value > 10) counts.critical += 1;
  else if (value >= 5) counts.watch += 1;
  else counts.normal += 1;
}

function finishCounts(counts) {
  const { sum, ...result } = counts;
  return { ...result, average: counts.measured ? sum / counts.measured : null };
}

export function summarizeWaterWatch(records, now = Date.now()) {
  const overall = emptyCounts();
  const recent = emptyCounts();
  const days = new Map();
  const months = new Map();
  let undated = 0;
  const currentTime = Number.isFinite(now) ? now : Date.now();
  const dayInMilliseconds = 24 * 60 * 60 * 1000;

  for (const record of Array.isArray(records) ? records : []) {
    if (!record) continue;
    const value = getArsenicPpb(record);
    addRecord(overall, value);

    const timestamp = new Date(record.collection_time).getTime();
    if (!record.collection_time || !Number.isFinite(timestamp)) {
      undated += 1;
      continue;
    }
    if (timestamp <= currentTime && timestamp >= currentTime - dayInMilliseconds) {
      addRecord(recent, value);
    }
    const key = bangkokDayKey(timestamp);
    if (!days.has(key)) days.set(key, emptyCounts());
    addRecord(days.get(key), value);
    const monthKey = key.slice(0, 7);
    if (!months.has(monthKey)) months.set(monthKey, emptyCounts());
    addRecord(months.get(monthKey), value);
  }

  return {
    overall: finishCounts(overall),
    recent: finishCounts(recent),
    daily: [...days.entries()]
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([day, counts]) => ({ day, ...finishCounts(counts) })),
    monthly: [...months.entries()]
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([month, counts]) => ({ month, ...finishCounts(counts) })),
    undated
  };
}
