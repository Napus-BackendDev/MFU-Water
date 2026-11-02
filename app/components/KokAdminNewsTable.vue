<script setup lang="ts">
import { computed } from 'vue'
import { Edit2, MapPin, Pin, RefreshCw, Search, Trash2 } from 'lucide-vue-next'
import KokKpiCard from './KokKpiCard.vue'
import KokPagination from './KokPagination.vue'
import { actionButtonClass, adminCardClass, pillClass, searchFieldClass, selectInPillClass, selectPillClass } from '../utils/admin-ui'
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
  (e: 'edit', article: NewsArticle): void
  (e: 'delete', article: NewsArticle): void
  (e: 'togglePin', article: NewsArticle): void
  (e: 'refresh'): void
}>()

const statusFilter = defineModel<'all' | 'published' | 'pinned' | 'draft'>('statusFilter', { default: 'all' })
const categoryFilter = defineModel<string>('categoryFilter', { default: 'all' })
const communityFilter = defineModel<string>('communityFilter', { default: 'all' })
const searchQuery = defineModel<string>('searchQuery', { default: '' })
const page = defineModel<number>('page', { default: 1 })
const pageSize = defineModel<number>('pageSize', { default: 10 })

const statusPills = computed(() => [
  { id: 'all' as const, label: 'ทั้งหมด', count: props.counts.total },
  { id: 'published' as const, label: 'เผยแพร่แล้ว', count: props.counts.published },
  { id: 'pinned' as const, label: 'ปักหมุด', count: props.counts.pinned },
  { id: 'draft' as const, label: 'ฉบับร่าง', count: props.counts.draft },
])

const filtered = computed(() => {
  let list = props.articles
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

const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

const shortDate = (isoStr: string) => formatDate(isoStr).replace(/\s*\d{4}$/, '')

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
  <div class="space-y-4">
    <!-- 4 KPI Cards for News Management (S5.1) -->
    <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <KokKpiCard label="ข่าวทั้งหมด" :value="counts.total" caption="ในระบบ 4 ชุมชน" />
      <KokKpiCard label="เผยแพร่แล้ว" :value="counts.published" tone="emerald" caption="แสดงบนหน้าข่าวสาธารณะ" />
      <KokKpiCard label="ข่าวปักหมุด" :value="counts.pinned" tone="amber" caption="แสดงเด่นบนสุดของหน้าข่าว" />
      <KokKpiCard label="ฉบับร่าง" :value="counts.draft" tone="slate" caption="รอตรวจสอบก่อนเผยแพร่" />
    </div>

    <!-- Filter Row -->
    <div class="flex flex-wrap items-center gap-2">
      <button
        v-for="item in statusPills"
        :key="item.id"
        type="button"
        :class="pillClass(statusFilter === item.id)"
        :aria-pressed="statusFilter === item.id"
        @click="statusFilter = item.id"
      >
        <Pin v-if="item.id === 'pinned'" class="h-3 w-3" />
        {{ item.label }} ({{ item.count }})
      </button>

      <label :class="selectPillClass">
        <span>หมวดหมู่</span>
        <select v-model="categoryFilter" :class="selectInPillClass">
          <option v-for="cat in NEWS_CATEGORIES" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
        </select>
      </label>

      <label :class="selectPillClass">
        <span>ชุมชน</span>
        <select v-model="communityFilter" :class="selectInPillClass">
          <option value="all">ทุกชุมชน</option>
          <option v-for="c in COMMUNITY_OPTIONS.filter((option) => option.value !== 'all')" :key="c.value" :value="c.value">{{ c.label }}</option>
        </select>
      </label>

      <div class="flex w-full items-center gap-2 xl:ml-auto xl:w-auto">
        <div class="relative min-w-0 flex-1 xl:w-72 xl:flex-none">
          <Search class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input v-model="searchQuery" type="text" aria-label="ค้นหาข่าวสาร" placeholder="ค้นหารหัสข่าว หรือหัวข้อข่าว..." :class="searchFieldClass" />
        </div>
        <button type="button" aria-label="รีเฟรช" title="รีเฟรช" :class="actionButtonClass" class="px-2.5!" :disabled="loading" @click="emit('refresh')">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <!-- Management Table (S5.1): rows become cards below lg, from the same markup -->
    <div :class="adminCardClass" class="overflow-hidden">
      <table class="block w-full text-left text-xs text-slate-700 lg:table dark:text-slate-200">
        <thead class="hidden border-b border-slate-200 text-slate-500 lg:table-header-group dark:border-[#2C2C2E] dark:text-[#98A2A8]">
          <tr>
            <th scope="col" class="whitespace-nowrap px-4 py-3 font-semibold">รหัสข่าว</th>
            <th scope="col" class="px-3 py-3 font-semibold">หัวข้อข่าวประชาสัมพันธ์</th>
            <th scope="col" class="whitespace-nowrap px-3 py-3 font-semibold">หมวดหมู่</th>
            <th scope="col" class="whitespace-nowrap px-3 py-3 font-semibold">พื้นที่ชุมชน</th>
            <th scope="col" class="whitespace-nowrap px-3 py-3 font-semibold">วันที่อัปเดต</th>
            <th scope="col" class="whitespace-nowrap px-3 py-3 font-semibold">ปักหมุด</th>
            <th scope="col" class="whitespace-nowrap px-3 py-3 font-semibold">สถานะ</th>
            <th scope="col" class="whitespace-nowrap px-4 py-3 text-right font-semibold">จัดการ</th>
          </tr>
        </thead>
        <tbody class="block lg:table-row-group lg:divide-y lg:divide-slate-100 lg:dark:divide-[#2C2C2E]/60">
          <tr v-if="loading && articles.length === 0" class="block lg:table-row">
            <td colspan="8" class="block py-12 text-center text-slate-500 lg:table-cell">กำลังโหลดรายการข่าวสาร...</td>
          </tr>
          <tr v-else-if="filtered.length === 0" class="block lg:table-row">
            <td colspan="8" class="block py-12 text-center text-slate-500 lg:table-cell">ไม่พบข่าวสารที่ตรงกับเงื่อนไข</td>
          </tr>
          <tr
            v-for="item in paged"
            :key="item.id"
            class="flex flex-wrap items-center gap-x-2 gap-y-2 border-b border-slate-200 p-4 transition last:border-b-0 lg:table-row lg:border-b-0 lg:p-0 lg:hover:bg-slate-50 dark:border-[#2C2C2E] lg:dark:hover:bg-[#252525]/60"
          >
            <!-- ID -->
            <td class="order-1 whitespace-nowrap font-mono font-semibold text-[#0369A1] lg:px-4 lg:py-3 dark:text-sky-400">{{ item.id }}</td>

            <!-- Title -->
            <td class="order-5 w-full border-b border-slate-100 pb-2.5 lg:w-auto lg:border-b-0 lg:px-3 lg:py-3 dark:border-[#2C2C2E]">
              <div class="line-clamp-1 text-[13px] font-semibold text-slate-900 dark:text-white" :title="item.title">{{ item.title }}</div>
            </td>

            <!-- Category -->
            <td class="order-6 whitespace-nowrap lg:px-3 lg:py-3">
              <span class="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold" :class="getCategoryBadge(item.category).badgeClass">
                {{ getCategoryBadge(item.category).label }}
              </span>
            </td>

            <!-- Community -->
            <td class="order-7 min-w-0 lg:px-3 lg:py-3">
              <span class="inline-flex max-w-32 items-center sm:max-w-44 gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-slate-200">
                <MapPin class="h-3 w-3 shrink-0 text-rose-500" />
                <span class="truncate">{{ item.community_name }}</span>
              </span>
            </td>

            <!-- Date -->
            <td class="order-2 whitespace-nowrap font-mono text-[11px] text-slate-500 lg:px-3 lg:py-3 dark:text-[#98A2A8]">
              <span class="mr-1 lg:hidden">•</span><span class="sm:hidden">{{ shortDate(item.updated_at || item.published_at || item.created_at) }}</span><span class="hidden sm:inline">{{ formatDate(item.updated_at || item.published_at || item.created_at) }}</span>
            </td>

            <!-- Pin Toggle -->
            <td class="order-3 ml-auto whitespace-nowrap lg:ml-0 lg:px-3 lg:py-3">
              <button
                type="button"
                title="สลับสถานะปักหมุด"
                class="inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition disabled:opacity-50"
                :class="item.is_pinned ? 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300' : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-800 dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-[#98A2A8] dark:hover:text-white'"
                :aria-pressed="item.is_pinned"
                :disabled="actionLoading === item.id"
                @click="emit('togglePin', item)"
              >
                <Pin v-if="item.is_pinned" class="h-3 w-3 fill-current" />
                {{ item.is_pinned ? 'ปักหมุด' : 'ปกติ' }}
              </button>
            </td>

            <!-- Status -->
            <td class="order-4 whitespace-nowrap lg:px-3 lg:py-3">
              <span
                class="inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                :class="item.status === 'published' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-slate-300 bg-white text-slate-600 dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-slate-300'"
              >
                {{ item.status === 'published' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง' }}
              </span>
            </td>

            <!-- Actions -->
            <td class="order-8 ml-auto whitespace-nowrap lg:ml-0 lg:px-4 lg:py-3 lg:text-right">
              <div class="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  title="แก้ไขข่าวสาร"
                  class="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-800 transition hover:border-[#0284C7] hover:text-[#0369A1] dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-slate-100 dark:hover:text-sky-300"
                  @click="emit('edit', item)"
                >
                  <Edit2 class="h-3.5 w-3.5" /> แก้ไข
                </button>
                <button
                  type="button"
                  title="ลบข่าวสาร"
                  class="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-rose-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:bg-[#252525] dark:text-rose-300 dark:hover:bg-rose-950/40"
                  :disabled="actionLoading === item.id"
                  @click="emit('delete', item)"
                >
                  <Trash2 class="h-3.5 w-3.5" /> ลบ
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <KokPagination v-model:page="page" v-model:page-size="pageSize" :total="filtered.length" />
    </div>
  </div>
</template>
