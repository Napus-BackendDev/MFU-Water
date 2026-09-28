/**
 * Helper utilities for Admin Portal filtering and formatting.
 */

export function getCollectorDisplayName(collector, defaultVal = 'เจ้าหน้าที่ทั่วไป') {
  if (typeof collector === 'object' && collector !== null) {
    return (
      collector.name ||
      collector.full_name ||
      collector.fullname ||
      collector.collector_name ||
      collector.organization ||
      collector.org ||
      'เจ้าหน้าที่'
    );
  }
  return collector || defaultVal;
}

export function filterAdminSubmissions(submissions, { searchQuery = '', statusFilter = 'all', photoFilter = 'all', reviewStatus = 'all' } = {}) {
  if (!Array.isArray(submissions)) return [];
  const q = String(searchQuery || '').toLowerCase().trim();

  return submissions.filter((sub) => {
    if (!sub) return false;
    const sampleCodeStr = typeof sub.sample_code === 'object' && sub.sample_code !== null
      ? String(sub.sample_code.code || sub.sample_code.id || '')
      : String(sub.sample_code ?? '');
    const codeMatch = sampleCodeStr.toLowerCase().includes(q);

    const stationNameStr = typeof sub.station_name === 'object' && sub.station_name !== null
      ? String(sub.station_name.name || sub.station_name.th || sub.station_name.label || '')
      : String(sub.station_name ?? '');
    const nameMatch = stationNameStr.toLowerCase().includes(q);

    const matchesSearch = !q || codeMatch || nameMatch;

    if (!matchesSearch) return false;
    if (reviewStatus !== 'all' && sub.publication_status !== reviewStatus) return false;

    // Status Filter
    const ppb = sub.measurements?.arsenic?.value ?? sub.arsenic_ppb ?? sub.arsenic_level_ppb ?? null;
    if (statusFilter !== 'all') {
      if (ppb === null || isNaN(Number(ppb))) return false;
      const val = Number(ppb);
      if (statusFilter === 'normal' && val >= 5) return false;
      if (statusFilter === 'watch' && (val < 5 || val > 10)) return false;
      if (statusFilter === 'critical' && val <= 10) return false;
    }

    // Photo Filter
    const hasImg = sub.images && sub.images.length > 0;
    if (photoFilter === 'with-photo' && !hasImg) return false;
    if (photoFilter === 'no-photo' && hasImg) return false;

    return true;
  });
}
