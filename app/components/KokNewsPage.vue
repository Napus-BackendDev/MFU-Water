<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  Filter,
  Image as ImageIcon,
  MapPin,
  Newspaper,
  Pin,
  RefreshCw,
  Search,
  Share2,
  Sparkles,
  User,
  ZoomIn,
} from 'lucide-vue-next'
import KokImageLightbox from './KokImageLightbox.vue'
import { useNews } from '../composables/useNews'
import {
  COMMUNITY_OPTIONS,
  NEWS_CATEGORIES,
  getCategoryBadge,
  type NewsArticle,
} from '../utils/news-types'

const emit = defineEmits<{ (e: 'backToMap'): void }>()

const {
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
} = useNews()

// Photo viewer: the cover is photo 0, the gallery follows.
const lightboxIndex = ref<number | null>(null)
const coverOffset = computed(() => (activeArticle.value?.cover_image_url ? 1 : 0))
const articleImages = computed(() => {
  const article = activeArticle.value
  return article ? [article.cover_image_url, ...(article.gallery_image_urls ?? [])].filter(Boolean) : []
})
watch(activeArticle, () => { lightboxIndex.value = null })

const copiedToast = ref(false)

function copyShareLink() {
  if (typeof window !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(window.location.href)
    copiedToast.value = true
    setTimeout(() => {
      copiedToast.value = false
    }, 2500)
  }
}

function formatDate(isoStr: string) {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return isoStr
  }
}

// When component mounts, load news and check url query
onMounted(() => {
  void fetchPublicNews()
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    if (id) {
      activeArticleId.value = id
      void fetchArticleById(id)
    }
  }
})

// Listen to browser popstate (back/forward button)
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    if (id) {
      activeArticleId.value = id
      void fetchArticleById(id)
    } else {
      activeArticleId.value = null
      activeArticle.value = null
    }
  })
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#121212] dark:text-white flex flex-col selection:bg-[#00E5FF] selection:text-[#081316]">
    <!-- Top Sticky Header matching KokAdminDataTablePage pattern -->
    <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 dark:border-[#2C2C2E] dark:bg-[#1E1E1E]/95 shadow-xs">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-slate-200 dark:hover:bg-[#2E2E30] dark:hover:text-white transition cursor-pointer"
            @click="emit('backToMap')"
          >
            <ArrowLeft class="h-4 w-4 text-[#0284C7] dark:text-[#00E5FF]" />
            <span>กลับสู่แผนที่</span>
          </button>

          <div class="h-5 w-px bg-slate-200 dark:bg-[#2C2C2E] hidden sm:block" />

          <div class="flex items-center gap-2.5">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-[#0284C7] border border-sky-200 dark:bg-sky-950/40 dark:text-[#00E5FF] dark:border-sky-900/50">
              <Newspaper class="h-5 w-5" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                  ศูนย์ข่าวสารและประชาสัมพันธ์ลุ่มน้ำกก
                </h1>
                <span class="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-[#0284C7] dark:bg-sky-950 dark:text-[#00E5FF] hidden md:inline-flex items-center gap-1">
                  <Sparkles class="h-3 w-3" /> อัปเดตข้อมูลจริง
                </span>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-[#98A2A8]">
                มหาวิทยาลัยแม่ฟ้าหลวง • ติดตามสถานการณ์น้ำ สารหนู และประกาศชุมชน
              </p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            aria-label="รีเฟรชข้อมูล"
            title="รีเฟรช"
            class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#252525] transition cursor-pointer"
            :disabled="loading"
            @click="fetchPublicNews()"
          >
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content Container -->
    <main class="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <!-- SUB-VIEW 2: ARTICLE DETAIL (S12.1) -->
      <article v-if="activeArticleId" class="space-y-6">
        <!-- Back Navigation & Share Button -->
        <div class="flex items-center justify-between gap-3">
          <button
            type="button"
            class="inline-flex items-center gap-2 text-sm font-semibold text-[#0284C7] dark:text-[#00E5FF] hover:underline cursor-pointer"
            @click="clearArticle()"
          >
            <ArrowLeft class="h-4 w-4" />
            <span>กลับสู่หน้ารวมข่าว</span>
          </button>

          <div class="relative">
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-slate-200 dark:hover:bg-[#252525] shadow-xs cursor-pointer transition"
              @click="copyShareLink"
            >
              <Share2 class="h-3.5 w-3.5" />
              <span>แชร์บทความ</span>
            </button>
            <div
              v-if="copiedToast"
              class="absolute right-0 top-10 rounded-lg bg-slate-900 text-white text-[11px] px-2.5 py-1 shadow-lg dark:bg-white dark:text-slate-900 whitespace-nowrap animate-fade-in"
            >
              คัดลอกลิงก์สำเร็จ!
            </div>
          </div>
        </div>

        <!-- Detail Loading State -->
        <div v-if="activeArticleLoading && !activeArticle" class="py-16 text-center text-slate-500">
          <RefreshCw class="h-8 w-8 animate-spin mx-auto text-[#0284C7] mb-2" />
          <p class="text-sm">กำลังโหลดเนื้อหาข่าวสาร...</p>
        </div>

        <template v-else-if="activeArticle">
          <!-- Article Header -->
          <div class="space-y-3">
            <div class="flex flex-wrap items-center gap-2">
              <span
                v-if="activeArticle.is_pinned"
                class="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-2 py-0.5 text-xs font-bold"
              >
                <Pin class="h-3 w-3 fill-amber-500 text-amber-600" />
                ปักหมุดสำคัญ
              </span>
              <span
                class="rounded-md px-2.5 py-0.5 text-xs font-semibold"
                :class="getCategoryBadge(activeArticle.category).badgeClass"
              >
                {{ getCategoryBadge(activeArticle.category).label }}
              </span>
              <span class="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-[#98A2A8]">
                <MapPin class="h-3.5 w-3.5 text-rose-500" />
                {{ activeArticle.community_name }}
              </span>
              <span class="text-xs text-slate-400">•</span>
              <span class="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-[#98A2A8]">
                <Clock class="h-3.5 w-3.5" />
                {{ formatDate(activeArticle.published_at) }}
              </span>
            </div>

            <h1 class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {{ activeArticle.title }}
            </h1>

            <div class="flex items-center gap-2 pt-1 text-xs text-slate-500 dark:text-[#98A2A8]">
              <User class="h-3.5 w-3.5 text-sky-500" />
              <span>ผู้เขียน/แหล่งข้อมูล: <strong class="text-slate-700 dark:text-slate-300">{{ activeArticle.author }}</strong></span>
            </div>
          </div>

          <!-- Cover Image -->
          <button
            v-if="activeArticle.cover_image_url"
            type="button"
            aria-label="ขยายภาพ"
            class="group relative block w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-[#2C2C2E] shadow-sm max-h-[500px] bg-slate-900 cursor-zoom-in"
            @click="lightboxIndex = 0"
          >
            <img
              :src="activeArticle.cover_image_url"
              :alt="activeArticle.title"
              class="w-full h-full object-cover object-center max-h-[500px]"
            />
            <span class="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"><ZoomIn class="h-4 w-4" /></span>
          </button>

          <!-- Summary Callout -->
          <div class="rounded-xl border border-sky-200 bg-sky-50/70 dark:border-sky-900/60 dark:bg-sky-950/30 p-4 sm:p-5 text-sky-950 dark:text-sky-200 leading-relaxed font-medium">
            <div class="text-xs font-bold uppercase tracking-wider text-[#0284C7] dark:text-[#00E5FF] mb-1">
              สรุปใจความสำคัญ (Summary)
            </div>
            <p class="text-sm sm:text-base">{{ activeArticle.summary }}</p>
          </div>

          <!-- Body Content (Parsed into readable paragraphs) -->
          <div class="space-y-4 text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed whitespace-pre-line py-2">
            {{ activeArticle.content }}
          </div>

          <!-- Gallery Photos (if any) -->
          <div v-if="activeArticle.gallery_image_urls && activeArticle.gallery_image_urls.length > 0" class="space-y-3 pt-4 border-t border-slate-200 dark:border-[#2C2C2E]">
            <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ImageIcon class="h-4 w-4 text-[#0284C7] dark:text-[#00E5FF]" />
              <span>ภาพถ่ายดาวเทียมและข้อมูลประกอบเพิ่มเติม ({{ activeArticle.gallery_image_urls.length }} ภาพ)</span>
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <button
                v-for="(imgUrl, idx) in activeArticle.gallery_image_urls"
                :key="idx"
                type="button"
                aria-label="ขยายภาพ"
                class="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-[#2C2C2E] bg-slate-100 dark:bg-[#1E1E1E] aspect-video shadow-xs cursor-zoom-in"
                @click="lightboxIndex = idx + coverOffset"
              >
                <img
                  :src="imgUrl"
                  :alt="`ภาพประกอบ ${idx + 1}`"
                  class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <span class="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"><ZoomIn class="h-3.5 w-3.5" /></span>
              </button>
            </div>
          </div>

          <KokImageLightbox
            v-if="lightboxIndex !== null"
            v-model:index="lightboxIndex"
            :images="articleImages"
            :alt="activeArticle.title"
            @close="lightboxIndex = null"
          />

          <!-- Bottom Footer Notice -->
          <div class="mt-8 rounded-xl border border-slate-200 bg-white dark:border-[#2C2C2E] dark:bg-[#1E1E1E] p-4 text-xs text-slate-500 dark:text-[#98A2A8] flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>
              โครงการวิจัยและติดตามคุณภาพน้ำลุ่มน้ำกก มหาวิทยาลัยแม่ฟ้าหลวง (MFU Kok Water Watch)
            </p>
            <button
              type="button"
              class="text-[#0284C7] dark:text-[#00E5FF] font-semibold hover:underline cursor-pointer"
              @click="clearArticle()"
            >
              ← กลับหน้ารวมข่าว
            </button>
          </div>
        </template>
      </article>

      <!-- SUB-VIEW 1: NEWS LIST (S12) -->
      <div v-else class="space-y-6">
        <!-- HERO PINNED ARTICLE CARD (IF ANY) -->
        <div
          v-if="heroPinnedArticle"
          class="relative rounded-2xl border border-amber-200 bg-linear-to-br from-amber-50/50 via-white to-sky-50/30 dark:border-amber-900/50 dark:from-[#1E1E1E] dark:via-[#1E1E1E] dark:to-amber-950/20 shadow-md overflow-hidden cursor-pointer group transition hover:shadow-xl hover:border-amber-300 dark:hover:border-amber-800"
          @click="selectArticle(heroPinnedArticle.id)"
        >
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 p-5 sm:p-6 items-center">
            <div class="lg:col-span-5 relative rounded-xl overflow-hidden border border-slate-200 dark:border-[#2C2C2E] aspect-video lg:aspect-4/3 bg-slate-900 shadow-sm">
              <img
                :src="heroPinnedArticle.cover_image_url || '/data/news/thaton-sentinel2-flood.png'"
                :alt="heroPinnedArticle.title"
                class="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
              <div class="absolute top-2.5 left-2.5">
                <span class="inline-flex items-center gap-1 rounded-md bg-amber-500 text-white px-2.5 py-1 text-xs font-bold shadow-md">
                  <Pin class="h-3 w-3 fill-white" />
                  ประกาศสำคัญ / ปักหมุด
                </span>
              </div>
            </div>

            <div class="lg:col-span-7 space-y-3">
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="rounded-md px-2.5 py-0.5 text-xs font-semibold"
                  :class="getCategoryBadge(heroPinnedArticle.category).badgeClass"
                >
                  {{ getCategoryBadge(heroPinnedArticle.category).label }}
                </span>
                <span class="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-[#98A2A8]">
                  <MapPin class="h-3.5 w-3.5 text-rose-500" />
                  {{ heroPinnedArticle.community_name }}
                </span>
                <span class="text-xs text-slate-400">•</span>
                <span class="text-xs text-slate-500 dark:text-[#98A2A8]">
                  {{ formatDate(heroPinnedArticle.published_at) }}
                </span>
              </div>

              <h2 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-snug group-hover:text-[#0284C7] dark:group-hover:text-[#00E5FF] transition">
                {{ heroPinnedArticle.title }}
              </h2>

              <p class="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                {{ heroPinnedArticle.summary }}
              </p>

              <div class="pt-2 flex items-center justify-between">
                <span class="text-xs text-slate-500 dark:text-[#98A2A8]">
                  โดย {{ heroPinnedArticle.author }}
                </span>
                <span class="inline-flex items-center gap-1 text-xs font-bold text-[#0284C7] dark:text-[#00E5FF]">
                  อ่านรายละเอียดบทความ →
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- SEARCH AND FILTER BAR -->
        <div class="space-y-3">
          <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <!-- Category Chips -->
            <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              <button
                v-for="cat in NEWS_CATEGORIES"
                :key="cat.value"
                type="button"
                class="rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer"
                :class="
                  selectedCategory === cat.value
                    ? 'bg-[#0284C7] text-white shadow-xs dark:bg-[#00E5FF] dark:text-slate-900'
                    : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-[#1E1E1E] dark:text-slate-200 dark:hover:bg-[#252525] border border-slate-200 dark:border-[#2C2C2E]'
                "
                @click="selectedCategory = cat.value"
              >
                {{ cat.label }}
              </button>
            </div>

            <!-- Community Dropdown & Search Input -->
            <div class="flex items-center gap-2 shrink-0">
              <select
                v-model="selectedCommunity"
                class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-slate-200 outline-none focus:border-[#0284C7] dark:focus:border-[#00E5FF] cursor-pointer"
              >
                <option v-for="c in COMMUNITY_OPTIONS" :key="c.value" :value="c.value">
                  {{ c.label }}
                </option>
              </select>

              <div class="relative w-full sm:w-60">
                <Search class="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="ค้นหาข่าวหรือหัวข้อ..."
                  class="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-700 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-slate-200 placeholder-slate-400 outline-none focus:border-[#0284C7] dark:focus:border-[#00E5FF]"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- ERROR OR EMPTY OR LOADING STATE -->
        <div v-if="loading && articles.length === 0" class="py-16 text-center text-slate-500">
          <RefreshCw class="h-8 w-8 animate-spin mx-auto text-[#0284C7] mb-2" />
          <p class="text-sm">กำลังโหลดข่าวสาร...</p>
        </div>

        <div v-else-if="error" class="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          <p class="text-sm font-semibold">{{ error }}</p>
          <button
            type="button"
            class="mt-3 text-xs font-bold underline text-rose-600 dark:text-rose-400 cursor-pointer"
            @click="fetchPublicNews()"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>

        <div v-else-if="filteredArticles.length === 0" class="py-16 text-center text-slate-500 border border-dashed border-slate-300 dark:border-[#2C2C2E] rounded-2xl">
          <Newspaper class="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p class="text-sm font-semibold">ไม่พบข่าวสารที่ตรงกับเงื่อนไขการค้นหา</p>
          <p class="text-xs text-slate-400 mt-1">ลองเปลี่ยนหมวดหมู่หรือคำค้นหา</p>
        </div>

        <!-- NEWS CARDS GRID (S12: 3-COL ON DESKTOP, 1-COL ON MOBILE) -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div
            v-for="item in filteredArticles"
            :key="item.id"
            class="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white dark:border-[#2C2C2E] dark:bg-[#1E1E1E] overflow-hidden shadow-xs hover:shadow-lg hover:border-[#0284C7] dark:hover:border-[#00E5FF] transition duration-200 cursor-pointer"
            @click="selectArticle(item.id)"
          >
            <!-- Card Image -->
            <div class="relative aspect-video w-full overflow-hidden bg-slate-900">
              <img
                :src="item.cover_image_url || '/data/news/thaton-map-preview.png'"
                :alt="item.title"
                class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
              <div class="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                <span
                  class="rounded-md px-2 py-0.5 text-[10px] font-bold shadow-xs"
                  :class="getCategoryBadge(item.category).badgeClass"
                >
                  {{ getCategoryBadge(item.category).label }}
                </span>
                <span
                  v-if="item.is_pinned"
                  class="rounded-md bg-amber-500 text-white px-1.5 py-0.5 text-[10px] font-bold shadow-xs"
                >
                  📌 ปักหมุด
                </span>
              </div>
            </div>

            <!-- Card Body -->
            <div class="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
              <div class="space-y-2">
                <div class="flex items-center gap-2 text-[11px] text-slate-500 dark:text-[#98A2A8]">
                  <span class="inline-flex items-center gap-1">
                    <MapPin class="h-3 w-3 text-rose-500" />
                    {{ item.community_name }}
                  </span>
                  <span>•</span>
                  <span>{{ formatDate(item.published_at) }}</span>
                </div>

                <h3 class="text-sm sm:text-base font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-[#0284C7] dark:group-hover:text-[#00E5FF] transition">
                  {{ item.title }}
                </h3>

                <p class="text-xs text-slate-600 dark:text-[#98A2A8] line-clamp-2 leading-relaxed">
                  {{ item.summary }}
                </p>
              </div>

              <!-- Card Footer -->
              <div class="pt-3 border-t border-slate-100 dark:border-[#2C2C2E] flex items-center justify-between text-xs">
                <span class="text-slate-500 dark:text-slate-400 truncate max-w-[60%]">
                  {{ item.author }}
                </span>
                <span class="text-[#0284C7] dark:text-[#00E5FF] font-bold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition">
                  อ่านต่อ →
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-in-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
