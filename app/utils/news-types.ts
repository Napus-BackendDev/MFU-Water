export type NewsCategory = 'urgent' | 'water' | 'flood' | 'event' | 'knowledge'

export type NewsStatus = 'draft' | 'published' | 'archived'

export interface NewsArticle {
  id: string
  title: string
  category: NewsCategory
  community_id: string
  community_name: string
  summary: string
  content: string
  cover_image_url: string
  gallery_image_urls?: string[]
  is_pinned: boolean
  status: NewsStatus
  author: string
  published_at: string
  created_at: string
  updated_at: string
}

export interface AdminNewsCounts {
  total: number
  published: number
  draft: number
  pinned: number
}

export interface CategoryOption {
  value: NewsCategory | 'all'
  label: string
  badgeClass: string
  dotColor: string
}

export const NEWS_CATEGORIES: CategoryOption[] = [
  { value: 'all', label: 'ทั้งหมด', badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200', dotColor: '#94a3b8' },
  { value: 'urgent', label: 'ด่วน/เตือนภัย', badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900', dotColor: '#dc2626' },
  { value: 'water', label: 'คุณภาพน้ำ', badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-900', dotColor: '#0284c7' },
  { value: 'flood', label: 'น้ำท่วม/ดาวเทียม', badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900', dotColor: '#d97706' },
  { value: 'event', label: 'กิจกรรมชุมชน', badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900', dotColor: '#16a34a' },
  { value: 'knowledge', label: 'สาระน่ารู้', badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-900', dotColor: '#9333ea' },
]

export const COMMUNITY_OPTIONS = [
  { value: 'all', label: 'ทุกลำน้ำ / ส่วนกลาง' },
  { value: 'thaton', label: 'บ้านท่าตอน (หมู่ 3)' },
  { value: 'ruammit', label: 'บ้านรวมมิตร' },
  { value: 'pongkhong', label: 'บ้านโป่งขมน' },
  { value: 'pakingtai', label: 'บ้านป่ากิ่งใต้' },
]

export function getCategoryBadge(cat: string): { label: string; badgeClass: string; dotColor: string } {
  const match = NEWS_CATEGORIES.find((c) => c.value === cat)
  if (match) return match
  return { label: cat, badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', dotColor: '#64748b' }
}
