import { communityTargets } from './kok-contract'
import type { AuditEntry } from './map-data-admin'

export const communityOptions = communityTargets.map((target) => ({ id: target.id, label: target.fullName }))

export type ChipTone = 'neutral' | 'emerald' | 'amber' | 'rose' | 'sky'
const chipTones: Record<ChipTone, string> = {
  neutral: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  emerald: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  amber: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
  rose: 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
  sky: 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
}
export const chipClass = (tone: ChipTone) => `inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${chipTones[tone]}`

const kindLabels: Record<string, string> = {
  households: 'ครัวเรือน',
  hamlets: 'หมู่บ้าน',
  places: 'สถานที่สำคัญ',
  settings: 'ตั้งค่าหน้าบ้าน',
  routes: 'เส้นทางอพยพ',
  profiles: 'การ์ดรู้จักชุมชน',
}
const actionLabels: Record<string, string> = {
  create: 'เพิ่ม',
  update: 'แก้ไข',
  delete: 'ลบ',
  publish: 'เผยแพร่',
  unpublish: 'ซ่อนจากหน้าบ้าน',
  merge: 'รวมหย่อม',
  'assign-hamlet': 'ผูกหย่อมให้ครัวเรือน',
  reset: 'คืนค่าเดิม',
}
export const auditText = (entry: AuditEntry) => `${actionLabels[entry.action] ?? entry.action} ${kindLabels[entry.kind] ?? entry.kind} ${entry.id}`

export const feedbackBannerClass = (type: 'success' | 'error') => type === 'success'
  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
  : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200'

export const subTabClass = 'inline-flex min-h-9 sm:min-h-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer'
export const sectionTitleClass = 'text-sm font-bold text-slate-900 dark:text-white'
export const mutedClass = 'text-xs text-slate-500 dark:text-[#98A2A8]'
export const dangerButtonClass = 'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50 cursor-pointer'
