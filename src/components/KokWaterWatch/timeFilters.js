export function getTimeReference(submissions, now = Date.now()) {
  let reference = now;
  for (const sample of submissions || []) {
    const time = new Date(sample?.collection_time).getTime();
    if (Number.isFinite(time) && time > reference) reference = time;
  }
  return reference;
}

export function isWithinTimeRange(dateStr, filter, customStart, customEnd, refTime = Date.now()) {
  try {
    if (!filter || filter === 'all') return true;
    if (!dateStr) return false;
    const targetDate = new Date(dateStr);
    const targetTime = targetDate.getTime();
    if (isNaN(targetTime)) return false;

    const refDate = new Date(refTime);

    const ONE_HOUR = 3600 * 1000;
    const ONE_DAY = 24 * ONE_HOUR;

    switch (filter) {
      case 'today': {
        const isSameDay = 
          targetDate.getFullYear() === refDate.getFullYear() &&
          targetDate.getMonth() === refDate.getMonth() &&
          targetDate.getDate() === refDate.getDate();
        return isSameDay || targetTime >= (refTime - ONE_DAY);
      }
      case '7days':
        return targetTime >= (refTime - 7 * ONE_DAY);
      case 'month': {
        const isSameMonth = 
          targetDate.getFullYear() === refDate.getFullYear() &&
          targetDate.getMonth() === refDate.getMonth();
        return isSameMonth || targetTime >= (refTime - 30 * ONE_DAY);
      }
      case '3months':
        return targetTime >= (refTime - 90 * ONE_DAY);
      case 'year': {
        const refYear = refDate.getFullYear();
        const targetYear = targetDate.getFullYear();
        return targetYear === refYear;
      }
      case '1year':
        return targetTime >= (refTime - 365 * ONE_DAY);
      case 'custom': {
        let startT = customStart ? new Date(customStart + 'T00:00:00').getTime() : null;
        let endT = customEnd ? new Date(customEnd + 'T23:59:59.999').getTime() : null;
        if (startT && isNaN(startT)) startT = null;
        if (endT && isNaN(endT)) endT = null;

        // หากผู้ใช้เลือกวันเริ่มต้นมากกว่าวันสิ้นสุด ให้สลับอัตโนมัติ ไม่ให้ผลลัพธ์เป็น 0 จุด
        if (startT && endT && startT > endT) {
          const temp = startT;
          startT = endT;
          endT = temp;
        }

        if (startT && targetTime < startT) return false;
        if (endT && targetTime > endT) return false;
        return true;
      }
      default:
        return true;
    }
  } catch (err) {
    console.warn('isWithinTimeRange error:', err);
    return true;
  }
}
