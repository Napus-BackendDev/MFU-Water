<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FlaskConical, LogOut, Moon, Newspaper, RefreshCw, ShieldAlert, ShieldCheck, Sun, X } from 'lucide-vue-next'
import { useAdminQueue } from '../composables/useAdminQueue'
import { useSampleFilters } from '../composables/useSampleFilters'
import { useAdminNews } from '../composables/useAdminNews'
import { exportSamplesCsv } from '../utils/admin-csv'
import type { AdminSample, Decision } from '../utils/admin-types'
import type { NewsArticle } from '../utils/news-types'
import KokAdminDecisionDialog from './KokAdminDecisionDialog.vue'
import KokAdminFilters from './KokAdminFilters.vue'
import KokAdminLogin from './KokAdminLogin.vue'
import KokAdminSampleDetail from './KokAdminSampleDetail.vue'
import KokAdminSampleTable from './KokAdminSampleTable.vue'
import KokAdminNewsTable from './KokAdminNewsTable.vue'
import KokAdminNewsForm from './KokAdminNewsForm.vue'
import KokKpiCard from './KokKpiCard.vue'
import KokPagination from './KokPagination.vue'

const emit = defineEmits<{ (e: 'backToMap'): void }>()

const queue = useAdminQueue()
const { isUnlocked, counts, feedback, loading, actionLoading } = queue
const { tab, severity, query, page, pageSize, filtered, paged } = useSampleFilters(queue.samples)

const adminNews = useAdminNews()
const adminTab = ref<'samples' | 'news'>('samples')
const isNewsFormOpen = ref(false)
const editingNews = ref<NewsArticle | null>(null)
const deleteConfirmArticle = ref<NewsArticle | null>(null)

watch(isUnlocked, (unlocked) => {
  if (unlocked) {
    void adminNews.fetchAdminNews()
  }
})

function switchAdminTab(t: 'samples' | 'news') {
  adminTab.value = t
  if (t === 'news') {
    void adminNews.fetchAdminNews()
  }
}

function handleCreateNews() {
  editingNews.value = null
  isNewsFormOpen.value = true
}

function handleEditNews(article: NewsArticle) {
  editingNews.value = article
  isNewsFormOpen.value = true
}

function handleDeleteNews(article: NewsArticle) {
  deleteConfirmArticle.value = article
}

async function confirmDeleteNews() {
  if (!deleteConfirmArticle.value) return
  const ok = await adminNews.deleteArticle(deleteConfirmArticle.value.id)
  if (ok) {
    deleteConfirmArticle.value = null
  }
}

async function handleSaveNews(payload: Partial<NewsArticle>) {
  const ok = await adminNews.saveArticle(payload)
  if (ok) {
    isNewsFormOpen.value = false
    editingNews.value = null
  }
}

async function handleTogglePin(article: NewsArticle) {
  await adminNews.togglePin(article.id)
}

const detail = ref<AdminSample | null>(null)
const decision = ref<{ sample: AdminSample; type: Decision } | null>(null)

async function confirmDecision(reason: string) {
  if (!decision.value) return
  if (await queue.review(decision.value.sample.sample_code, decision.value.type, reason)) decision.value = null
}

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
const toggleTheme = () => { colorMode.preference = isDark.value ? 'light' : 'dark' }

const headerButton = 'flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-slate-200 dark:hover:bg-[#2E2E30] transition'
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#121212] dark:text-white flex flex-col">
    <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 dark:border-[#2C2C2E] dark:bg-[#1E1E1E]/95 shadow-xs">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-slate-200 dark:hover:bg-[#2E2E30] dark:hover:text-white transition"
            @click="emit('backToMap')"
          >
            <ArrowLeft class="h-4 w-4" />
            <span>กลับสู่แผนที่สาธารณะ</span>
          </button>

          <div class="h-5 w-px bg-slate-200 dark:bg-[#2C2C2E] hidden sm:block" />

          <div class="flex items-center gap-2.5">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50">
              <ShieldAlert class="h-5 w-5" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-sm font-bold text-slate-900 dark:text-white sm:text-base">ระบบตรวจสอบและจัดการข้อมูลน้ำ (Admin Data Table)</h1>
                <span v-if="isUnlocked" class="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hidden md:inline-flex items-center gap-1">
                  <ShieldCheck class="h-3 w-3" /> แอดมินเข้าสู่ระบบแล้ว
                </span>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-[#98A2A8]">มหาวิทยาลัยแม่ฟ้าหลวง • โครงการวิจัยและติดตามคุณภาพน้ำลุ่มน้ำกก</p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button type="button" aria-label="สลับโหมดสี" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#252525] transition" @click="toggleTheme">
            <Sun v-if="isDark" class="h-4 w-4 text-amber-400" />
            <Moon v-else class="h-4 w-4 text-slate-600" />
          </button>

          <template v-if="isUnlocked">
            <button
              type="button"
              :class="headerButton"
              :disabled="loading || adminNews.loading.value"
              @click="adminTab === 'samples' ? queue.fetchSamples() : adminNews.fetchAdminNews()"
            >
              <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': loading || adminNews.loading.value }" />
              <span class="hidden sm:inline">รีเฟรช</span>
            </button>
            <button
              v-if="adminTab === 'samples'"
              type="button"
              :class="headerButton"
              @click="exportSamplesCsv(filtered)"
            >
              <Download class="h-3.5 w-3.5" />
              <span class="hidden sm:inline">ส่งออก CSV</span>
            </button>
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 transition"
              @click="queue.logout()"
            >
              <LogOut class="h-3.5 w-3.5" />
              <span class="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </template>
        </div>
      </div>
    </header>

    <main class="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
      <KokAdminLogin
        v-if="!isUnlocked"
        v-model:passcode="queue.passcode.value"
        v-model:reviewer="queue.reviewer.value"
        :verifying="queue.verifying.value"
        :error="queue.loginError.value"
        @submit="queue.login()"
        @cancel="emit('backToMap')"
      />

      <div v-else class="space-y-5">
        <!-- Sub-Navigation Tab Switcher (S5 / S5.1) -->
        <div class="flex items-center gap-2 border-b border-slate-200 dark:border-[#2C2C2E] pb-3">
          <button
            type="button"
            class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
            :class="
              adminTab === 'samples'
                ? 'bg-[#0284C7] text-white dark:bg-[#00E5FF] dark:text-slate-900 shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-[#1E1E1E] dark:text-slate-200 dark:hover:bg-[#252525] border border-slate-200 dark:border-[#2C2C2E]'
            "
            @click="switchAdminTab('samples')"
          >
            <FlaskConical class="h-4 w-4" />
            <span>ตรวจตัวอย่างน้ำ (>50 ppb)</span>
            <span
              v-if="counts.pending > 0"
              class="rounded-full bg-rose-500 text-white px-1.5 py-0.2 text-[10px] font-bold"
            >
              {{ counts.pending }}
            </span>
          </button>

          <button
            type="button"
            class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
            :class="
              adminTab === 'news'
                ? 'bg-[#0284C7] text-white dark:bg-[#00E5FF] dark:text-slate-900 shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-[#1E1E1E] dark:text-slate-200 dark:hover:bg-[#252525] border border-slate-200 dark:border-[#2C2C2E]'
            "
            @click="switchAdminTab('news')"
          >
            <Newspaper class="h-4 w-4" />
            <span>จัดการข่าวสารประชาสัมพันธ์</span>
            <span
              v-if="adminNews.counts.value.total > 0"
              class="rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.2 text-[10px]"
            >
              {{ adminNews.counts.value.total }}
            </span>
          </button>
        </div>

        <!-- TAB 1: SAMPLES REVIEW -->
        <template v-if="adminTab === 'samples'">
          <div
            v-if="feedback"
            class="rounded-xl p-3.5 text-xs font-medium flex items-center justify-between gap-3 shadow-sm transition"
            :class="feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800' : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800'"
          >
            <div class="flex items-center gap-2">
              <CheckCircle2 v-if="feedback.type === 'success'" class="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <AlertTriangle v-else class="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{{ feedback.message }}</span>
            </div>
            <button type="button" aria-label="ปิดข้อความ" class="text-slate-400 hover:text-slate-600" @click="feedback = null"><X class="h-4 w-4" /></button>
          </div>

          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <KokKpiCard label="ตัวอย่างน้ำทั้งหมด" :value="counts.total" />
            <KokKpiCard label="รอตรวจสอบ (>50 ppb)" :value="counts.pending" tone="amber" :highlight="counts.pending > 0" />
            <KokKpiCard label="อนุมัติแล้ว" :value="counts.approved" tone="emerald" />
            <KokKpiCard label="เผยแพร่อัตโนมัติ (<=50 ppb)" :value="counts.autoPublished" tone="sky" />
          </div>

          <KokAdminFilters v-model:tab="tab" v-model:severity="severity" v-model:query="query" :counts="counts" />

          <div class="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-[#2C2C2E] dark:bg-[#1E1E1E]">
            <KokAdminSampleTable
              :items="paged"
              :loading="loading"
              :action-loading="actionLoading"
              @detail="detail = $event"
              @decide="(sample, type) => (decision = { sample, type })"
            />
            <KokPagination v-model:page="page" v-model:page-size="pageSize" :total="filtered.length" />
          </div>
        </template>

        <!-- TAB 2: NEWS MANAGEMENT (S5.1 & S5.2) -->
        <template v-else-if="adminTab === 'news'">
          <!-- News Feedback Notice -->
          <div
            v-if="adminNews.feedback.value"
            class="rounded-xl p-3.5 text-xs font-medium flex items-center justify-between gap-3 shadow-sm transition"
            :class="adminNews.feedback.value.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800' : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800'"
          >
            <div class="flex items-center gap-2">
              <CheckCircle2 v-if="adminNews.feedback.value.type === 'success'" class="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <AlertTriangle v-else class="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{{ adminNews.feedback.value.message }}</span>
            </div>
            <button type="button" aria-label="ปิดข้อความ" class="text-slate-400 hover:text-slate-600" @click="adminNews.feedback.value = null"><X class="h-4 w-4" /></button>
          </div>

          <!-- S5.2: Create / Edit News Form -->
          <KokAdminNewsForm
            v-if="isNewsFormOpen"
            :initial-data="editingNews"
            :saving="adminNews.actionLoading.value !== null"
            @save="handleSaveNews"
            @cancel="isNewsFormOpen = false; editingNews = null"
          />

          <!-- S5.1: News Management Table -->
          <KokAdminNewsTable
            v-else
            :articles="adminNews.articles.value"
            :counts="adminNews.counts.value"
            :loading="adminNews.loading.value"
            :action-loading="adminNews.actionLoading.value"
            v-model:status-filter="adminNews.statusFilter.value"
            v-model:category-filter="adminNews.categoryFilter.value"
            v-model:community-filter="adminNews.communityFilter.value"
            v-model:search-query="adminNews.searchQuery.value"
            v-model:page="adminNews.page.value"
            v-model:page-size="adminNews.pageSize.value"
            @create="handleCreateNews"
            @edit="handleEditNews"
            @delete="handleDeleteNews"
            @toggle-pin="handleTogglePin"
          />
        </template>
      </div>
    </main>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="deleteConfirmArticle"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-[#2C2C2E] dark:bg-[#1E1E1E] space-y-4">
        <h3 class="text-base font-bold text-slate-900 dark:text-white">ยืนยันการลบข่าวสารประชาสัมพันธ์</h3>
        <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          คุณต้องการลบข่าว <strong>"{{ deleteConfirmArticle.title }}"</strong> (รหัส {{ deleteConfirmArticle.id }}) ใช่หรือไม่? ข้อมูลจะถูกลบออกจากฐานข้อมูลอย่างถาวร
        </p>
        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            class="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#2C2C2E] dark:text-slate-300 dark:hover:bg-[#252525] cursor-pointer"
            @click="deleteConfirmArticle = null"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            class="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer"
            :disabled="adminNews.actionLoading.value !== null"
            @click="confirmDeleteNews"
          >
            ยืนยันลบข่าว
          </button>
        </div>
      </div>
    </div>

    <KokAdminDecisionDialog
      v-if="decision"
      :sample="decision.sample"
      :decision="decision.type"
      :saving="actionLoading === decision.sample.sample_code"
      @confirm="confirmDecision"
      @close="decision = null"
    />

    <KokAdminSampleDetail
      v-if="detail"
      :sample="detail"
      @close="detail = null"
      @approve="decision = { sample: detail, type: 'approve' }; detail = null"
    />
  </div>
</template>
