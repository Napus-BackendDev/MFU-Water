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
  sample_nature?: { water_source?: string; water_appearance?: string }
  publication_status: PublicationStatus
  reviewed_at?: string | null
  reviewed_by?: string | null
  review_reason?: string | null
  private_photo_paths?: string[]
  contact_name: string | null
  contact_phone: string | null
}

export type AdminCounts = { total: number; pending: number; approved: number; autoPublished: number; rejected: number }

export type Decision = 'approve' | 'reject'

export const emptyCounts = (): AdminCounts => ({ total: 0, pending: 0, approved: 0, autoPublished: 0, rejected: 0 })

// Label and colours for each publication status, shared by the table, filters and detail view.
export const statusMeta: Record<PublicationStatus, { label: string; badge: string; tab: string }> = {
  pending_review: {
    label: '⏳ รอตรวจสอบ',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800',
    tab: 'bg-amber-600',
  },
  approved: {
    label: '✅ อนุมัติแล้ว',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800',
    tab: 'bg-emerald-600',
  },
  auto_published: {
    label: '🟢 เผยแพร่อัตโนมัติ',
    badge: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300 dark:border-sky-800',
    tab: 'bg-sky-600',
  },
  rejected: {
    label: '❌ ปฏิเสธ',
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    tab: 'bg-rose-600',
  },
}

export function formatThaiDate(iso: string): string {
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function getArsenicMeta(ppb: number) {
  const match = contractData.levels.find((level) => level.ppb === ppb)
  if (match) return match
  if (ppb > 50) return { color: '#7A2E1E', hex: '#7A2E1E', action: 'เกินเกณฑ์วิกฤติ (>50 ppb)' }
  if (ppb > 10) return { color: '#E5A93C', hex: '#E5A93C', action: 'เกินมาตรฐานผิวดิน (>10 ppb)' }
  return { color: '#FFFFFF', hex: '#FFFFFF', action: 'เกณฑ์ปกติ (<=10 ppb)' }
}

export const arsenicSeverity = (ppb: number) => (ppb > 50 ? 'critical' : ppb > 10 ? 'watch' : 'safe')
