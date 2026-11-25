import { computed, ref } from 'vue'
import { getAdminToken, getDevCommunities, getDevRoleId } from '../utils/admin-session'
import { formatErrorWithReason } from '../utils/map-data-admin'
import type { AdminNewsCounts, NewsArticle } from '../utils/news-types'

const sessionExpiredMessage = 'เซสชันแอดมินหมดอายุ กรุณาเข้าสู่ระบบใหม่'

export function useAdminNews(onSessionExpired?: (message: string) => void) {
  const articles = ref<NewsArticle[]>([])
  const counts = ref<AdminNewsCounts>({
    total: 0,
    published: 0,
    pinned: 0,
  })
  const loading = ref(false)
  const actionLoading = ref<string | null>(null)
  const feedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)

  const searchQuery = ref('')
  const statusFilter = ref<'all' | 'published' | 'pinned'>('all')
  const categoryFilter = ref<string>('all')
  const communityFilter = ref<string>('all')

  const page = ref(1)
  const pageSize = ref(10)

  async function adminFetch(url: string, init: RequestInit = {}) {
    const token = getAdminToken()
    const devRole = getDevRoleId()
    const devCommunities = getDevCommunities()
    let response: Response
    try {
      response = await fetch(url, {
        ...init,
        headers: {
          ...(init.body ? { 'content-type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(devRole ? { 'x-dev-role-id': devRole } : {}),
          ...(devCommunities ? { 'x-dev-communities': devCommunities } : {}),
        },
      })
    } catch (err) {
      throw new Error(formatErrorWithReason('เชื่อมต่อระบบข่าวสารไม่สำเร็จ', err instanceof Error ? err.message : 'เครือข่ายขัดข้อง'))
    }
    if (response.status === 401) {
      onSessionExpired?.(sessionExpiredMessage)
      throw new Error(formatErrorWithReason('ดำเนินการไม่สำเร็จ', sessionExpiredMessage))
    }
    return response
  }

  async function fetchAdminNews(manual = false) {
    loading.value = true
    if (manual) feedback.value = null
    try {
      const res = await adminFetch('/api/admin/news')
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        throw new Error(formatErrorWithReason('โหลดรายการข่าวสารไม่สำเร็จ', data?.error || `HTTP ${res.status}`))
      }
      articles.value = data.items || []
      if (data.counts) {
        counts.value = data.counts
      }
      if (manual) {
        feedback.value = { type: 'success', message: `รีเฟรชรายการข่าวสารเรียบร้อยแล้ว (${articles.value.length} รายการ)` }
      }
    } catch (err: any) {
      feedback.value = { type: 'error', message: formatErrorWithReason('โหลดรายการข่าวสารไม่สำเร็จ', err?.message) }
    } finally {
      loading.value = false
    }
  }

  const filteredArticles = computed(() => {
    let list = articles.value
    if (statusFilter.value !== 'all') {
      list = list.filter((a) => statusFilter.value === 'pinned' ? a.is_pinned : a.status === statusFilter.value)
    }
    if (categoryFilter.value && categoryFilter.value !== 'all') {
      list = list.filter((a) => a.category === categoryFilter.value)
    }
    if (communityFilter.value && communityFilter.value !== 'all') {
      list = list.filter((a) => a.community_id === communityFilter.value)
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      list = list.filter((a) =>
        a.title.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.community_name.toLowerCase().includes(q)
      )
    }
    return list
  })

  const pagedArticles = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return filteredArticles.value.slice(start, start + pageSize.value)
  })

  async function saveArticle(data: Partial<NewsArticle>): Promise<boolean> {
    actionLoading.value = data.id || 'new'
    feedback.value = null
    try {
      if (!data.title?.trim()) throw new Error('กรุณาระบุหัวข้อข่าวสาร')
      if (!data.summary?.trim()) throw new Error('กรุณาระบุเนื้อหาสรุปข่าวสาร')
      const isEdit = !!data.id
      const url = isEdit ? `/api/admin/news/${encodeURIComponent(data.id!)}` : '/api/admin/news'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await adminFetch(url, {
        method,
        body: JSON.stringify(data),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok || !result.ok) {
        throw new Error(result.error || `เซิร์ฟเวอร์ปฏิเสธคำขอ (HTTP ${res.status})`)
      }
      await fetchAdminNews(false)
      feedback.value = {
        type: 'success',
        message: isEdit ? `อัปเดตข่าว ${data.id} เรียบร้อยแล้ว` : `สร้างข่าวใหม่ ${result.article?.id || ''} สำเร็จ`,
      }
      return true
    } catch (err: any) {
      feedback.value = { type: 'error', message: formatErrorWithReason('บันทึกข่าวสารไม่สำเร็จ', err?.message) }
      return false
    } finally {
      actionLoading.value = null
    }
  }

  async function deleteArticle(id: string): Promise<boolean> {
    actionLoading.value = id
    feedback.value = null
    try {
      if (!id) throw new Error('ไม่พบรหัสข่าวที่ต้องการลบ')
      const res = await adminFetch(`/api/admin/news/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok || !result.ok) {
        throw new Error(result.error || `เซิร์ฟเวอร์ปฏิเสธคำขอ (HTTP ${res.status})`)
      }
      await fetchAdminNews(false)
      feedback.value = { type: 'success', message: `ลบข่าว ${id} สำเร็จ` }
      return true
    } catch (err: any) {
      feedback.value = { type: 'error', message: formatErrorWithReason('ลบข่าวสารไม่สำเร็จ', err?.message) }
      return false
    } finally {
      actionLoading.value = null
    }
  }

  async function togglePin(id: string): Promise<boolean> {
    actionLoading.value = id
    try {
      const item = articles.value.find((a) => a.id === id)
      if (!item) throw new Error(`ไม่พบข่าวรหัส ${id} ในรายการ`)
      const res = await adminFetch(`/api/admin/news/${encodeURIComponent(id)}/pin`, {
        method: 'POST',
        body: JSON.stringify({ is_pinned: !item.is_pinned }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok || !result.ok) {
        throw new Error(result.error || `เซิร์ฟเวอร์ปฏิเสธคำขอ (HTTP ${res.status})`)
      }
      item.is_pinned = result.article.is_pinned
      counts.value.pinned = articles.value.filter((a) => a.is_pinned).length
      feedback.value = {
        type: 'success',
        message: item.is_pinned ? `ปักหมุดข่าว “${item.title}” เรียบร้อยแล้ว` : `ยกเลิกปักหมุดข่าว “${item.title}” แล้ว`,
      }
      return true
    } catch (err: any) {
      feedback.value = { type: 'error', message: formatErrorWithReason('เปลี่ยนสถานะปักหมุดข่าวไม่สำเร็จ', err?.message) }
      return false
    } finally {
      actionLoading.value = null
    }
  }

  async function uploadNewsAsset(file: File, kind: 'image' | 'file') {
    const label = kind === 'file' ? 'ไฟล์แนบ' : 'รูปภาพ'
    try {
      if (!file) throw new Error(`ไม่ได้เลือก${label}`)
      const token = getAdminToken()
      const devRole = getDevRoleId()
      const devCommunities = getDevCommunities()
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_') || (kind === 'file' ? 'document.pdf' : 'news-photo.jpg')
      const url = `/api/admin/news/upload?filename=${encodeURIComponent(sanitizedName)}&kind=${kind}`
      const defaultMime = kind === 'file' ? 'application/octet-stream' : 'image/jpeg'
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': file.type || defaultMime,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(devRole ? { 'x-dev-role-id': devRole } : {}),
          ...(devCommunities ? { 'x-dev-communities': devCommunities } : {}),
        },
        body: file,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `อัปโหลดไม่สำเร็จ (HTTP ${res.status})`)
      }
      feedback.value = { type: 'success', message: `อัปโหลด${label} “${file.name}” เรียบร้อยแล้ว` }
      return {
        url: String(data.publicUrl || data.url || ''),
        filename: String(data.filename || sanitizedName),
        size: Number(data.size ?? file.size),
      }
    } catch (err: any) {
      const msg = formatErrorWithReason(`อัปโหลด${label}ข่าวไม่สำเร็จ`, err?.message)
      feedback.value = { type: 'error', message: msg }
      throw new Error(msg)
    }
  }

  async function uploadNewsPhoto(file: File): Promise<string> {
    const uploaded = await uploadNewsAsset(file, 'image')
    return uploaded.url
  }

  async function uploadNewsFile(file: File): Promise<{ url: string; filename: string; size: number }> {
    return uploadNewsAsset(file, 'file')
  }

  return {
    articles,
    counts,
    loading,
    actionLoading,
    feedback,
    searchQuery,
    statusFilter,
    categoryFilter,
    communityFilter,
    page,
    pageSize,
    filteredArticles,
    pagedArticles,
    fetchAdminNews,
    saveArticle,
    deleteArticle,
    togglePin,
    uploadNewsPhoto,
    uploadNewsFile,
  }
}
