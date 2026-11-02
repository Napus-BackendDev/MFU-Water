<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FlaskConical, LogOut, MousePointerClick, Newspaper, Plus, RefreshCw, Waves, X } from 'lucide-vue-next'
import { useAdminQueue } from '../composables/useAdminQueue'
import { useSampleFilters } from '../composables/useSampleFilters'
import { useAdminNews } from '../composables/useAdminNews'
import { exportSamplesCsv } from '../utils/admin-csv'
import { actionButtonClass, adminCardClass, primaryButtonClass } from '../utils/admin-ui'
import type { AdminSample, Decision, SampleEdit } from '../utils/admin-types'
import type { NewsArticle } from '../utils/news-types'
import KokAdminDecisionDialog from './KokAdminDecisionDialog.vue'
import KokAdminSampleEditDialog from './KokAdminSampleEditDialog.vue'
import KokModalShell from './KokModalShell.vue'
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

const adminNews = useAdminNews(queue.logout)
const adminTab = ref<'samples' | 'news'>('samples')
const isNewsFormOpen = ref(false)
const editingNews = ref<NewsArticle | null>(null)
const deleteConfirmArticle = ref<NewsArticle | null>(null)
const newsError = computed(() => adminNews.feedback.value?.type === 'error' ? adminNews.feedback.value.message : null)

watch(isUnlocked, (unlocked) => {
  if (unlocked) {
    void adminNews.fetchAdminNews()
  } else {
    deleteConfirmArticle.value = null
    editingSample.value = null
    deletingSample.value = null
    isNewsFormOpen.value = false
    editingNews.value = null
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
  adminNews.feedback.value = null
  editingNews.value = article
  isNewsFormOpen.value = true
}

function handleDeleteNews(article: NewsArticle) {
  adminNews.feedback.value = null
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

// Looked up by code so the panel shows fresh data after a review reloads the list.
const detailCode = ref<string | null>(null)
const detail = computed(() => queue.samples.value.find((sample) => sample.sample_code === detailCode.value) ?? null)
const decision = ref<{ sample: AdminSample; type: Decision } | null>(null)

const editingSample = ref<AdminSample | null>(null)
const deletingSample = ref<AdminSample | null>(null)
const sampleError = computed(() => feedback.value?.type === 'error' ? feedback.value.message : null)

async function saveSample(values: SampleEdit) {
  if (editingSample.value && await queue.updateSample(editingSample.value.sample_code, values)) editingSample.value = null
}

async function confirmDeleteSample() {
  if (!deletingSample.value || !await queue.deleteSample(deletingSample.value.sample_code)) return
  deletingSample.value = null
  detailCode.value = null
}

async function confirmDecision(reason: string) {
  if (!decision.value) return
  if (await queue.review(decision.value.sample.sample_code, decision.value.type, reason)) decision.value = null
}

const mobileTitle = computed(() => adminTab.value === 'news' ? 'แอดมิน · จัดการข่าวสาร' : 'แอดมิน · ตรวจตัวอย่างน้ำ')
const tabClass = (active: boolean) => ['flex flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition', active ? 'bg-[#0284C7] text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white']
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#121212] dark:text-white flex flex-col">
    <header class="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-[#2C2C2E] dark:bg-[#1E1E1E]">
      <div class="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-3 gap-y-2.5">
        <button type="button" aria-label="กลับสู่แผนที่สาธารณะ" :class="actionButtonClass" @click="emit('backToMap')">
          <ArrowLeft class="h-3.5 w-3.5" />
          <span>กลับ</span>
        </button>

        <div class="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0284C7] text-white sm:flex">
          <Waves class="h-5 w-5" />
        </div>

        <div class="min-w-0 flex-1">
          <h1 class="text-sm font-bold leading-tight text-slate-900 dark:text-white">
            <span class="sm:hidden">{{ mobileTitle }}</span>
            <span class="hidden sm:inline sm:text-[17px]">ระบบจัดการข้อมูลแอดมิน (Admin Management Console)</span>
          </h1>
          <p class="hidden truncate text-xs text-slate-500 sm:block dark:text-[#98A2A8]">มหาวิทยาลัยแม่ฟ้าหลวง • โครงการวิจัยและติดตามคุณภาพน้ำลุ่มน้ำกก</p>
        </div>

        <template v-if="isUnlocked">
          <nav aria-label="ส่วนงานแอดมิน" class="order-last flex w-full rounded-xl border border-slate-200 bg-slate-100 p-1 xl:order-none xl:w-auto dark:border-[#2C2C2E] dark:bg-[#141416]">
            <button type="button" :class="tabClass(adminTab === 'samples')" :aria-pressed="adminTab === 'samples'" @click="switchAdminTab('samples')">
              <FlaskConical class="h-4 w-4 shrink-0" />
              <span>ตรวจ<span class="hidden sm:inline">ตัวอย่าง</span>น้ำ (&gt;50 ppb)</span>
              <span v-if="counts.pending > 0" class="rounded-full bg-[#DC2626] px-1.5 text-[10px] font-bold text-white">{{ counts.pending }}</span>
            </button>
            <button type="button" :class="tabClass(adminTab === 'news')" :aria-pressed="adminTab === 'news'" @click="switchAdminTab('news')">
              <Newspaper class="h-4 w-4 shrink-0" />
              <span>จัดการข่าวสาร<span class="hidden sm:inline">ประชาสัมพันธ์</span></span>
            </button>
          </nav>

          <button v-if="adminTab === 'news' && !isNewsFormOpen" type="button" :class="primaryButtonClass" @click="handleCreateNews">
            <Plus class="h-4 w-4" />
            <span>สร้างข่าวใหม่</span>
          </button>

          <button type="button" aria-label="ออกจากระบบ" title="ออกจากระบบ" :class="actionButtonClass" class="px-2.5!" @click="queue.logout()">
            <LogOut class="h-4 w-4" />
          </button>
        </template>
      </div>
    </header>

    <main class="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6">
      <KokAdminLogin
        v-if="!isUnlocked"
        v-model:passcode="queue.passcode.value"
        v-model:reviewer="queue.reviewer.value"
        :verifying="queue.verifying.value"
        :error="queue.loginError.value"
        @submit="queue.login()"
        @cancel="emit('backToMap')"
      />

      <div v-else class="space-y-4">
        <!-- TAB 1: SAMPLES REVIEW (S5) -->
        <template v-if="adminTab === 'samples'">
          <div
            v-if="feedback"
            class="flex items-center justify-between gap-3 rounded-xl border p-3.5 text-xs font-medium"
            :class="feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200'"
          >
            <div class="flex items-center gap-2">
              <CheckCircle2 v-if="feedback.type === 'success'" class="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <AlertTriangle v-else class="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{{ feedback.message }}</span>
            </div>
            <button type="button" aria-label="ปิดข้อความ" class="text-slate-500 hover:text-slate-700" @click="feedback = null"><X class="h-4 w-4" /></button>
          </div>

          <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <KokKpiCard label="ทั้งหมด" :value="counts.total" caption="ตัวอย่างน้ำในระบบ" />
            <KokKpiCard label="รอตรวจ > 50 ppb" :value="counts.pending" tone="rose" caption="รอแอดมินตรวจก่อนเผยแพร่" />
            <KokKpiCard label="อนุมัติแล้ว" :value="counts.approved + counts.autoPublished" tone="emerald" caption="แสดงบนแผนที่สาธารณะ" />
            <KokKpiCard label="ปฏิเสธ" :value="counts.rejected" tone="slate" caption="ไม่แสดงบนแผนที่" />
          </div>

          <KokAdminFilters v-model:tab="tab" v-model:severity="severity" v-model:query="query" :counts="counts">
            <button type="button" aria-label="รีเฟรช" title="รีเฟรช" :class="actionButtonClass" class="px-2.5!" :disabled="loading" @click="queue.fetchSamples()">
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
            </button>
            <button type="button" aria-label="Export CSV" :class="actionButtonClass" @click="exportSamplesCsv(filtered)">
              <Download class="h-4 w-4" />
              <span class="hidden sm:inline">Export CSV</span>
            </button>
          </KokAdminFilters>

          <div class="grid items-start gap-4 xl:grid-cols-[1.9fr_1fr]">
            <div :class="adminCardClass" class="min-w-0 overflow-hidden">
              <KokAdminSampleTable :items="paged" :loading="loading" :selected="detail?.sample_code ?? null" @select="detailCode = $event.sample_code" />
              <KokPagination v-model:page="page" v-model:page-size="pageSize" :total="filtered.length" />
            </div>

            <!-- Detail: a side panel on wide screens, a dialog over the table below xl -->
            <aside
              class="xl:sticky xl:top-[5.5rem] xl:z-auto xl:block xl:bg-transparent xl:p-0"
              :class="detail ? 'fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 sm:items-center sm:p-4' : 'hidden'"
              @click.self="detailCode = null"
            >
              <KokAdminSampleDetail
                v-if="detail"
                :key="detail.sample_code"
                :sample="detail"
                :saving="actionLoading === detail.sample_code"
                @close="detailCode = null"
                @decide="decision = { sample: detail!, type: $event }"
                @edit="feedback = null; editingSample = detail"
                @delete="feedback = null; deletingSample = detail"
              />
              <div v-else :class="adminCardClass" class="flex h-64 flex-col items-center justify-center gap-2 p-5 text-center text-xs text-slate-500 dark:text-[#98A2A8]">
                <MousePointerClick class="h-5 w-5" />
                <span>เลือกแถวในตารางเพื่อดูรายละเอียดและตรวจตัวอย่าง</span>
              </div>
            </aside>
          </div>
        </template>

        <!-- TAB 2: NEWS MANAGEMENT (S5.1 & S5.2) -->
        <template v-else-if="adminTab === 'news'">
          <div
            v-if="adminNews.feedback.value"
            class="flex items-center justify-between gap-3 rounded-xl border p-3.5 text-xs font-medium"
            :class="adminNews.feedback.value.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200'"
          >
            <div class="flex items-center gap-2">
              <CheckCircle2 v-if="adminNews.feedback.value.type === 'success'" class="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <AlertTriangle v-else class="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{{ adminNews.feedback.value.message }}</span>
            </div>
            <button type="button" aria-label="ปิดข้อความ" class="text-slate-500 hover:text-slate-700" @click="adminNews.feedback.value = null"><X class="h-4 w-4" /></button>
          </div>

          <!-- S5.2: Create / Edit News Form -->
          <KokAdminNewsForm
            v-if="isNewsFormOpen"
            :initial-data="editingNews"
            :saving="adminNews.actionLoading.value !== null"
            :save-error="newsError"
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
            @edit="handleEditNews"
            @delete="handleDeleteNews"
            @toggle-pin="handleTogglePin"
            @refresh="adminNews.fetchAdminNews()"
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
        <p v-if="newsError" role="alert" class="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{{ newsError }}</p>
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

    <KokAdminSampleEditDialog
      v-if="editingSample"
      :sample="editingSample"
      :saving="actionLoading === editingSample.sample_code"
      :error="sampleError"
      @save="saveSample"
      @close="editingSample = null"
    />

    <KokModalShell v-if="deletingSample" width-class="max-w-md" @close="deletingSample = null">
      <h3 class="text-base font-bold">ยืนยันการลบข้อมูลตัวอย่างน้ำ</h3>
      <p class="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
        ลบรหัส <strong class="font-mono">{{ deletingSample.sample_code }}</strong> ({{ deletingSample.arsenic_ppb }} ppb) พร้อมข้อมูลติดต่อและภาพถ่าย จุดนี้จะหายจากแผนที่สาธารณะ และกู้คืนไม่ได้
      </p>
      <p v-if="sampleError" role="alert" class="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{{ sampleError }}</p>
      <div class="flex items-center justify-end gap-2 pt-2">
        <button type="button" :class="actionButtonClass" @click="deletingSample = null">ยกเลิก</button>
        <button type="button" class="cursor-pointer rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50" :disabled="actionLoading === deletingSample.sample_code" @click="confirmDeleteSample">
          ยืนยันลบข้อมูล
        </button>
      </div>
    </KokModalShell>

    <KokAdminDecisionDialog
      v-if="decision"
      :sample="decision.sample"
      :decision="decision.type"
      :saving="actionLoading === decision.sample.sample_code"
      @confirm="confirmDecision"
      @close="decision = null"
    />
  </div>
</template>
