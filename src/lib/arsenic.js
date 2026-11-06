// One arsenic scale for the whole system: map, point detail, admin table and research reports.
// The threshold is the Pollution Control Department surface-water standard of 10 ppb that the
// project quotes everywhere (kok-contract.ts); 50 ppb is a separate rule about who may publish a
// result, not a safety level, so it never relabels water as safe.

export const ARSENIC_LIMIT_PPB = 10
export const ARSENIC_WATCH_PPB = 5
export const ARSENIC_REVIEW_PPB = 50

/** @typedef {'normal' | 'watch' | 'over'} ArsenicLevel */

/** @type {Record<ArsenicLevel, { label: string; shortLabel: string; note: string; hex: string; darkHex: string }>} */
export const arsenicLevelMeta = {
  normal: {
    label: 'ปกติ',
    shortLabel: 'ปกติ',
    note: `ต่ำกว่า ${ARSENIC_WATCH_PPB} ppb`,
    hex: '#16A34A',
    darkHex: '#32D74B',
  },
  watch: {
    label: 'เฝ้าระวัง',
    shortLabel: 'เฝ้าระวัง',
    note: `อยู่ในช่วงเฝ้าระวัง ${ARSENIC_WATCH_PPB}–${ARSENIC_LIMIT_PPB} ppb`,
    hex: '#B45309',
    darkHex: '#FF9F0A',
  },
  over: {
    label: 'เกินเกณฑ์',
    shortLabel: 'เกินเกณฑ์',
    note: `เกินเกณฑ์ ${ARSENIC_LIMIT_PPB} ppb ของ คพ. (น้ำผิวดิน)`,
    hex: '#DC2626',
    darkHex: '#FF453A',
  },
}

/**
 * @param {number} ppb
 * @returns {ArsenicLevel}
 */
export function arsenicLevel(ppb) {
  const value = Number(ppb) || 0
  if (value > ARSENIC_LIMIT_PPB) return 'over'
  if (value >= ARSENIC_WATCH_PPB) return 'watch'
  return 'normal'
}

/** A result above this needs an admin to approve it before the public map shows it. */
export const needsAdminReview = (ppb) => (Number(ppb) || 0) > ARSENIC_REVIEW_PPB

/** A sample the public may see: at or under the review line, or approved by an admin. */
export const isPublicSample = (ppb, status) => !needsAdminReview(ppb) || status === 'approved'
