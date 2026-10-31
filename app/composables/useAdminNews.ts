import { computed, ref } from 'vue'
import { getAdminToken } from '../utils/admin-session'
import type { AdminNewsCounts, NewsArticle } from '../utils/news-types'

export function useAdminNews() {
  const articles = ref<NewsArticle[]>([])
  const counts = ref<AdminNewsCounts>({
    total: 0,
    published: 0,
    draft: 0,
    pinned: 0,
  })
  const loading = ref(false)
  const actionLoading = ref<string | null>(null)
  const feedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)

  const searchQuery = ref('')
  const statusFilter = ref<'all' | 'published' | 'draft'>('all')
  const categoryFilter = ref<string>('all')
  const communityFilter = ref<string>('all')

  const page = ref(1)
  const pageSize = ref(10)

  async function adminFetch(url: string, init: RequestInit = {}) {
    const token = getAdminToken()
    const response = await fetch(url, {
      ...init,
      headers: {
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    return response
  }

  async function fetchAdminNews() {
    loading.value = true
    feedback.value = null
    try {
      const res = await adminFetch('/api/admin/news')
      if (!res.ok) throw new Error('โหลดรายการข่าวสารไม่สำเร็จ')
      const data = await res.json()
      if (data.ok) {
        articles.value = data.items || []
        if (data.counts) {
          counts.value = data.counts
        }
      }
    } catch (err: any) {
      feedback.value = { type: 'error', message: err?.message || 'เกิดข้อผิดพลาดในการโหลดข่าวสาร' }
    } finally {
      loading.value = false
    }
  }

  const filteredArticles = computed(() => {
    let list = articles.value
    if (statusFilter.value !== 'all') {
      list = list.filter((a) => a.status === statusFilter.value)
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
      const isEdit = !!data.id
      const url = isEdit ? `/api/admin/news/${encodeURIComponent(data.id!)}` : '/api/admin/news'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await adminFetch(url, {
        method,
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok || !result.ok) {
        throw new Error(result.error || 'บันทึกข่าวไม่สำเร็จ')
      }
      feedback.value = {
        type: 'success',
        message: isEdit ? `อัปเดตข่าว ${data.id} เรียบร้อยแล้ว` : `สร้างข่าวใหม่ ${result.article?.id || ''} สำเร็จ`,
      }
      await fetchAdminNews()
      return true
    } catch (err: any) {
      feedback.value = { type: 'error', message: err?.message || 'บันทึกข่าวไม่สำเร็จ' }
      return false
    } finally {
      actionLoading.value = null
    }
  }

  async function deleteArticle(id: string): Promise<boolean> {
    actionLoading.value = id
    feedback.value = null
    try {
      const res = await adminFetch(`/api/admin/news/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      const result = await res.json()
      if (!res.ok || !result.ok) {
        throw new Error(result.error || 'ลบข่าวไม่สำเร็จ')
      }
      feedback.value = { type: 'success', message: `ลบข่าว ${id} สำเร็จ` }
      await fetchAdminNews()
      return true
    } catch (err: any) {
      feedback.value = { type: 'error', message: err?.message || 'ลบข่าวไม่สำเร็จ' }
      return false
    } finally {
      actionLoading.value = null
    }
  }

  async function togglePin(id: string): Promise<boolean> {
    actionLoading.value = id
    try {
      const res = await adminFetch(`/api/admin/news/${encodeURIComponent(id)}/pin`, {
        method: 'POST',
      })
      const result = await res.json()
      if (!res.ok || !result.ok) {
        throw new Error(result.error || 'เปลี่ยนสถานะปักหมุดไม่สำเร็จ')
      }
      const item = articles.value.find((a) => a.id === id)
      if (item) {
        item.is_pinned = result.is_pinned
        // Recalculate pinned count
        counts.value.pinned = articles.value.filter((a) => a.is_pinned).length
      }
      return true
    } catch (err: any) {
      feedback.value = { type: 'error', message: err?.message || 'เปลี่ยนสถานะปักหมุดไม่สำเร็จ' }
      return false
    } finally {
      actionLoading.value = null
    }
  }

  async function uploadNewsPhoto(file: File): Promise<string> {
    const token = getAdminToken()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const url = `/api/admin/news/upload?filename=${encodeURIComponent(sanitizedName)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'image/jpeg',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: file,
    })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'อัปโหลดภาพไม่สำเร็จ')
    }
    return data.url
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
  }
}
