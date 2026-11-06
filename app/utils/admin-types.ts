import { ARSENIC_LIMIT_PPB, ARSENIC_REVIEW_PPB, arsenicLevel, arsenicLevelMeta } from '../../src/lib/arsenic'
import { contractData } from './kok-contract'

export type PublicationStatus = 'pending_review' | 'approved' | 'auto_published' | 'rejected'

export type AdminSample = {
  sample_code: string
  station_name?: string
  latitude: number
  longitude: number
  collection_time: string
  created_at?: string
  gps_accuracy_meters: number | null
  arsenic_ppb: number
  measurements?: { arsenic?: { unit?: string; value?: number; status?: string } }
  sample_nature?: { water_source?: string; water_appearance?: string; test_kit?: string }
  publication_status: PublicationStatus
  reviewed_at?: string | null
  reviewed_by?: string | null
  review_reason?: string | null
  edited_at?: string | null
  edited_by?: string | null
  private_photo_paths?: string[]
  contact_name: string | null
  contact_phone: string | null
}

export type AdminCounts = { total: number; pending: number; approved: number; autoPublished: number; rejected: number }

export type Decision = 'approve' | 'reject'

export type SampleEdit = {
  arsenicPpb: number
  latitude: number
  longitude: number
  collectionTime: string
  waterSource: string
  contactName: string
  contactPhone: string
}

export const emptyCounts = (): AdminCounts => ({ total: 0, pending: 0, approved: 0, autoPublished: 0, rejected: 0 })

// Label and colours for each publication status, shared by the table, filters and detail view.
export const statusMeta: Record<PublicationStatus, { label: string; badge: string }> = {
  pending_review: {
    label: 'รอตรวจ',
    badge: 'bg-rose-50 text-rose-700 border-rose-500 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
  },
  approved: {
    label: 'อนุมัติแล้ว',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  },
  auto_published: {
    label: 'อนุมัติแล้ว',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  },
  rejected: {
    label: 'ปฏิเสธ',
    badge: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
}

export function formatThaiDate(iso: string): string {
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function getArsenicMeta(ppb: number) {
  const meta = arsenicLevelMeta[arsenicLevel(ppb)]
  // The nine kit colours stay as printed on the strip; the label always comes from the shared scale.
  const swatch = contractData.levels.find((level) => level.ppb === ppb)
  return { ...swatch, color: swatch?.color ?? meta.hex, hex: swatch?.color ?? meta.hex, action: `${meta.label} (${meta.note})` }
}

// Same scale as the public map: above the 10 ppb surface-water limit is already over, whoever is looking.
export const arsenicSeverity = arsenicLevel

export { ARSENIC_LIMIT_PPB, ARSENIC_REVIEW_PPB }
