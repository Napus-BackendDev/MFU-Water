<script setup lang="ts">
import { computed } from 'vue'
import {
  Calendar,
  Edit2,
  ExternalLink,
  Filter,
  MapPin,
  Newspaper,
  Pin,
  Plus,
  Search,
  Trash2,
} from 'lucide-vue-next'
import KokKpiCard from './KokKpiCard.vue'
import KokPagination from './KokPagination.vue'
import {
  COMMUNITY_OPTIONS,
  NEWS_CATEGORIES,
  getCategoryBadge,
  type AdminNewsCounts,
  type NewsArticle,
} from '../utils/news-types'

const props = defineProps<{
  articles: NewsArticle[]
  counts: AdminNewsCounts
  loading: boolean
  actionLoading: string | null
}>()

const emit = defineEmits<{
  (e: 'create'): void
  (e: 'edit', article: NewsArticle): void
  (e: 'delete', article: NewsArticle): void
  (e: 'togglePin', article: NewsArticle): void
}>()

const statusFilter = defineModel<'all' | 'published' | 'draft'>('statusFilter', { default: 'all' })
const categoryFilter = defineModel<string>('categoryFilter', { default: 'all' })
const communityFilter = defineModel<string>('communityFilter', { default: 'all' })
const searchQuery = defineModel<string>('searchQuery', { default: '' })
const page = defineModel<number>('page', { default: 1 })
const pageSize = defineModel<number>('pageSize', { default: 10 })

const filtered = computed(() => {
  let list = props.articles
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

const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

function formatDate(isoStr: string) {
  if (!isoStr) return '-'
  try {
    return new Date(isoStr).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return isoStr
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- 4 KPI Cards for News Management (S5.1) -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      <KokKpiCard label="ข่าวทั้งหมด" :value="counts.total" />
      <KokKpiCard label="เผยแพร่แล้ว" :value="counts.published" tone="emerald" />
      <KokKpiCard label="ฉบับร่าง (Draft)" :value="counts.draft" tone="amber" :highlight="counts.draft > 0" />
      <KokKpiCard label="ปักหมุดสำคัญ" :value="counts.pinned" tone="sky" />
    </div>

    <!-- Filter & Action Row -->
    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-[#2C2C2E] dark:bg-[#1E1E1E] space-y-3">
      <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <!-- Status Pills -->
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer"
            :class="
              statusFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#252525]'
            "
            @click="statusFilter = 'all'"
          >
            ทั้งหมด ({{ counts.total }})
          </button>
          <button
            type="button"
            class="rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer"
            :class="
              statusFilter === 'published'
                ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#252525]'
            "
            @click="statusFilter = 'published'"
          >
            เผยแพร่แล้ว ({{ counts.published }})
          </button>
          <button
            type="button"
            class="rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer"
            :class="
              statusFilter === 'draft'
                ? 'bg-amber-600 text-white dark:bg-amber-500'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#252525]'
            "
            @click="statusFilter = 'draft'"
          >
            ฉบับร่าง ({{ counts.draft }})
          </button>
        </div>

        <!-- + Create News Button -->
        <button
          type="button"
          class="wv-btn-primary bg-[#0284C7]! border-[#0284C7]! text-white! hover:bg-[#0369A1]! flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-4 rounded-xl cursor-pointer shadow-sm"
          @click="emit('create')"
        >
          <Plus class="h-4 w-4" />
          <span>สร้างข่าวประชาสัมพันธ์ใหม่</span>
        </button>
      </div>

      <!-- Secondary Filter Row -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-[#2C2C2E]">
        <div class="flex flex-wrap items-center gap-2">
          <!-- Category Select -->
          <select
            v-model="categoryFilter"
            class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-slate-200 outline-none cursor-pointer"
          >
            <option v-for="cat in NEWS_CATEGORIES" :key="cat.value" :value="cat.value">
              {{ cat.label }}
            </option>
          </select>

          <!-- Community Select -->
          <select
            v-model="communityFilter"
            class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-slate-200 outline-none cursor-pointer"
          >
            <option v-for="c in COMMUNITY_OPTIONS" :key="c.value" :value="c.value">
              {{ c.label }}
            </option>
          </select>
        </div>

        <!-- Search Input -->
        <div class="relative w-full sm:w-64">
          <Search class="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหาชื่อ, รหัส, สรุป..."
            class="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-700 dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-slate-200 placeholder-slate-400 outline-none"
          />
        </div>
      </div>
    </div>

    <!-- Management Table (S5.1) -->
    <div class="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-[#2C2C2E] dark:bg-[#1E1E1E]">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-700 dark:text-slate-200">
          <thead class="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-[#98A2A8]">
            <tr>
              <th scope="col" class="py-3 px-3 w-10 text-center">หมุด</th>
              <th scope="col" class="py-3 px-3 w-28">รหัสข่าว</th>
              <th scope="col" class="py-3 px-4 min-w-[240px]">หัวข้อและเนื้อหา</th>
              <th scope="col" class="py-3 px-3">หมวดหมู่</th>
              <th scope="col" class="py-3 px-3">พื้นที่เป้าหมาย</th>
              <th scope="col" class="py-3 px-3">สถานะ</th>
              <th scope="col" class="py-3 px-3">วันที่</th>
              <th scope="col" class="py-3 px-4 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-[#2C2C2E]">
            <tr v-if="loading && articles.length === 0">
              <td colspan="8" class="py-12 text-center text-slate-400">
                กำลังโหลดรายการข่าวสาร...
              </td>
            </tr>
            <tr v-else-if="filtered.length === 0">
              <td colspan="8" class="py-12 text-center text-slate-400">
                ไม่พบข้อมูลข่าวสารที่ตรงกับเงื่อนไข
              </td>
            </tr>
            <tr
              v-for="item in paged"
              :key="item.id"
              class="hover:bg-slate-50/70 dark:hover:bg-[#252525]/50 transition"
            >
              <!-- Pin Toggle Button -->
              <td class="py-3 px-3 text-center">
                <button
                  type="button"
                  title="สลับสถานะปักหมุด"
                  class="p-1 rounded-lg transition cursor-pointer"
                  :class="item.is_pinned ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'text-slate-300 hover:text-slate-500 dark:text-slate-600'"
                  :disabled="actionLoading === item.id"
                  @click="emit('togglePin', item)"
                >
                  <Pin class="h-4 w-4" :class="{ 'fill-amber-500': item.is_pinned }" />
                </button>
              </td>

              <!-- ID -->
              <td class="py-3 px-3 font-mono font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                {{ item.id }}
              </td>

              <!-- Title & Summary Excerpt -->
              <td class="py-3 px-4">
                <div class="font-semibold text-slate-900 dark:text-white line-clamp-1">
                  {{ item.title }}
                </div>
                <div class="text-[11px] text-slate-500 dark:text-[#98A2A8] line-clamp-1 mt-0.5">
                  {{ item.summary }}
                </div>
              </td>

              <!-- Category Badge -->
              <td class="py-3 px-3 whitespace-nowrap">
                <span
                  class="rounded-md px-2 py-0.5 text-[10px] font-semibold"
                  :class="getCategoryBadge(item.category).badgeClass"
                >
                  {{ getCategoryBadge(item.category).label }}
                </span>
              </td>

              <!-- Community Badge -->
              <td class="py-3 px-3 whitespace-nowrap text-slate-600 dark:text-slate-300 text-[11px]">
                {{ item.community_name }}
              </td>

              <!-- Status -->
              <td class="py-3 px-3 whitespace-nowrap">
                <span
                  v-if="item.status === 'published'"
                  class="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold"
                >
                  เผยแพร่แล้ว
                </span>
                <span
                  v-else
                  class="rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold"
                >
                  ฉบับร่าง
                </span>
              </td>

              <!-- Date -->
              <td class="py-3 px-3 whitespace-nowrap text-[11px] text-slate-500 dark:text-[#98A2A8]">
                {{ formatDate(item.published_at || item.created_at) }}
              </td>

              <!-- Actions -->
              <td class="py-3 px-4 text-right whitespace-nowrap">
                <div class="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-[#0284C7] hover:text-[#0284C7] dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-slate-200 dark:hover:text-[#00E5FF] transition cursor-pointer"
                    title="แก้ไขข่าวสาร"
                    @click="emit('edit', item)"
                  >
                    <Edit2 class="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition cursor-pointer"
                    title="ลบข่าวสาร"
                    :disabled="actionLoading === item.id"
                    @click="emit('delete', item)"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <KokPagination
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="filtered.length"
      />
    </div>
  </div>
</template>
