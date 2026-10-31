import { computed, ref } from 'vue'
import type { NewsArticle } from '../utils/news-types'

export function useNews() {
  const articles = ref<NewsArticle[]>([])
  const pinnedArticles = ref<NewsArticle[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const selectedCategory = ref<string>('all')
  const selectedCommunity = ref<string>('all')
  const searchQuery = ref<string>('')

  const activeArticleId = ref<string | null>(null)
  const activeArticle = ref<NewsArticle | null>(null)
  const activeArticleLoading = ref(false)

  const filteredArticles = computed(() => {
    let list = articles.value
    if (selectedCategory.value && selectedCategory.value !== 'all') {
      list = list.filter((a) => a.category === selectedCategory.value)
    }
    if (selectedCommunity.value && selectedCommunity.value !== 'all') {
      list = list.filter((a) => a.community_id === selectedCommunity.value || a.community_id === 'all')
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      list = list.filter((a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.community_name.toLowerCase().includes(q)
      )
    }
    return list
  })

  // Top hero pinned article (if any)
  const heroPinnedArticle = computed(() => {
    if (pinnedArticles.value.length > 0) return pinnedArticles.value[0]
    return articles.value.find((a) => a.is_pinned) || null
  })

  async function fetchPublicNews() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch('/api/news')
      if (!res.ok) throw new Error('โหลดข่าวสารไม่สำเร็จ')
      const data = await res.json()
      if (data.ok) {
        articles.value = data.items || []
        pinnedArticles.value = data.pinned || []
      }
    } catch (err: any) {
      error.value = err?.message || 'เกิดข้อผิดพลาดในการโหลดข่าวสาร'
    } finally {
      loading.value = false
    }
  }

  async function fetchArticleById(id: string) {
    activeArticleLoading.value = true
    try {
      // First check in-memory
      const found = articles.value.find((a) => a.id === id)
      if (found) {
        activeArticle.value = found
      }
      const res = await fetch(`/api/news/${encodeURIComponent(id)}`)
      if (!res.ok) throw new Error('ไม่พบข้อมูลข่าวสารที่ระบุ')
      const data = await res.json()
      if (data.ok && data.article) {
        activeArticle.value = data.article
      }
    } catch (err: any) {
      error.value = err?.message || 'ไม่พบข่าวสาร'
    } finally {
      activeArticleLoading.value = false
    }
  }

  function selectArticle(id: string) {
    activeArticleId.value = id
    if (typeof window !== 'undefined' && window.history) {
      const url = new URL(window.location.href)
      url.searchParams.set('view', 'news')
      url.searchParams.set('id', id)
      window.history.pushState(null, '', url.toString())
    }
    void fetchArticleById(id)
  }

  function clearArticle() {
    activeArticleId.value = null
    activeArticle.value = null
    if (typeof window !== 'undefined' && window.history) {
      const url = new URL(window.location.href)
      url.searchParams.set('view', 'news')
      url.searchParams.delete('id')
      window.history.pushState(null, '', url.toString())
    }
  }

  return {
    articles,
    pinnedArticles,
    loading,
    error,
    selectedCategory,
    selectedCommunity,
    searchQuery,
    filteredArticles,
    heroPinnedArticle,
    activeArticleId,
    activeArticle,
    activeArticleLoading,
    fetchPublicNews,
    fetchArticleById,
    selectArticle,
    clearArticle,
  }
}
