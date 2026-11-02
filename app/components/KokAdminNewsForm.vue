<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowLeft, Check, Circle, CircleCheck, CloudUpload, FileText, Image as ImageIcon, Pin, Plus, RefreshCw, Save, Send, Settings, Trash2 } from 'lucide-vue-next'
import { actionButtonClass, adminCardClass, fieldClass, fieldLabelClass } from '../utils/admin-ui'
import {
  COMMUNITY_OPTIONS,
  NEWS_CATEGORIES,
  type NewsArticle,
  type NewsCategory,
  type NewsStatus,
} from '../utils/news-types'
import { useAdminNews } from '../composables/useAdminNews'

const props = defineProps<{
  initialData?: NewsArticle | null
  saving: boolean
  saveError?: string | null
}>()

const emit = defineEmits<{
  (e: 'save', payload: Partial<NewsArticle>): void
  (e: 'cancel'): void
}>()

const { uploadNewsPhoto } = useAdminNews()

const isEdit = computed(() => !!props.initialData?.id)

const coverInputRef = ref<HTMLInputElement | null>(null)
const galleryInputRef = ref<HTMLInputElement | null>(null)
const uploadingCover = ref(false)
const uploadingGallery = ref(false)
const uploadError = ref<string | null>(null)
const showCustomUrlInput = ref(false)

const form = ref<{
  id?: string
  title: string
  category: NewsCategory
  community_id: string
  summary: string
  content: string
  cover_image_url: string
  is_pinned: boolean
  status: NewsStatus
  author: string
}>({
  title: '',
  category: 'water',
  community_id: 'all',
  summary: '',
  content: '',
  cover_image_url: '/data/news/thaton-sentinel2-flood.png',
  is_pinned: false,
  status: 'published',
  author: 'ศูนย์ประสานงานวิจัยลุ่มน้ำกก มฟล.',
})

const galleryUrls = ref<string[]>([])

const presetCovers = [
  { label: 'น้ำท่วม Sentinel-2', url: '/data/news/thaton-sentinel2-flood.png' },
  { label: 'ภาพดาวเทียมปกติ', url: '/data/news/thaton-normal-sat.png' },
  { label: 'เรดาร์ SAR น้ำท่วม', url: '/data/news/thaton-sar-flood.png' },
  { label: 'แผนที่จุดตรวจน้ำ', url: '/data/news/thaton-map-preview.png' },
  { label: 'อบรมและเก็บตัวอย่าง', url: '/data/news/water-lab-training.png' },
  { label: 'ชุดทดสอบสารหนู', url: '/data/news/arsenic-kit-guide.png' },
]

watch(
  () => props.initialData,
  (val) => {
    if (val) {
      form.value = {
        id: val.id,
        title: val.title || '',
        category: val.category || 'water',
        community_id: val.community_id || 'all',
        summary: val.summary || '',
        content: val.content || '',
        cover_image_url: val.cover_image_url || '/data/news/thaton-sentinel2-flood.png',
        is_pinned: !!val.is_pinned,
        status: val.status || 'published',
        author: val.author || 'ศูนย์ประสานงานวิจัยลุ่มน้ำกก มฟล.',
      }
      galleryUrls.value = Array.isArray(val.gallery_image_urls) ? [...val.gallery_image_urls] : []
    } else {
      form.value = {
        title: '',
        category: 'water',
        community_id: 'all',
        summary: '',
        content: '',
        cover_image_url: '/data/news/thaton-sentinel2-flood.png',
        is_pinned: false,
        status: 'published',
        author: 'ศูนย์ประสานงานวิจัยลุ่มน้ำกก มฟล.',
      }
      galleryUrls.value = []
    }
  },
  { immediate: true }
)

const validationError = ref<string | null>(null)

const statusOptions = [
  { value: 'published' as const, label: 'เผยแพร่ทันที', active: 'border-[#16A34A] bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' },
  { value: 'draft' as const, label: 'เก็บเป็นฉบับร่าง', active: 'border-slate-500 bg-slate-100 text-slate-800 dark:bg-[#252525] dark:text-slate-100' },
]
const coverFileName = computed(() => form.value.cover_image_url.split('/').pop())

// Handle cover image file upload
async function onCoverFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingCover.value = true
  uploadError.value = null
  try {
    const url = await uploadNewsPhoto(file)
    form.value.cover_image_url = url
  } catch (err: any) {
    uploadError.value = err?.message || 'อัปโหลดภาพหน้าปกไม่สำเร็จ ลองใหม่อีกครั้ง'
  } finally {
    uploadingCover.value = false
    if (coverInputRef.value) coverInputRef.value.value = ''
  }
}

// Handle gallery images file upload
async function onGalleryFilesSelected(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files || files.length === 0) return
  uploadingGallery.value = true
  uploadError.value = null
  try {
    for (let i = 0; i < files.length; i++) {
      const url = await uploadNewsPhoto(files[i])
      galleryUrls.value.push(url)
    }
  } catch (err: any) {
    uploadError.value = err?.message || 'อัปโหลดภาพประกอบบางภาพไม่สำเร็จ'
  } finally {
    uploadingGallery.value = false
    if (galleryInputRef.value) galleryInputRef.value.value = ''
  }
}

function removeCoverPhoto() {
  form.value.cover_image_url = ''
}

function removeGalleryPhoto(index: number) {
  galleryUrls.value.splice(index, 1)
}

function handleSubmit() {
  validationError.value = null
  if (!form.value.title.trim()) {
    validationError.value = 'กรุณาระบุหัวข้อข่าวประชาสัมพันธ์'
    return
  }
  if (!form.value.content.trim()) {
    validationError.value = 'กรุณาระบุเนื้อหาข่าว'
    return
  }

  const communityObj = COMMUNITY_OPTIONS.find((c) => c.value === form.value.community_id)
  const communityName = communityObj ? communityObj.label : 'ทุกลำน้ำ / ส่วนกลาง'

  const payload: Partial<NewsArticle> = {
    id: form.value.id,
    title: form.value.title.trim(),
    category: form.value.category,
    community_id: form.value.community_id,
    community_name: communityName,
    summary: form.value.summary.trim() || form.value.title.trim(),
    content: form.value.content.trim(),
    cover_image_url: form.value.cover_image_url.trim(),
    gallery_image_urls: galleryUrls.value,
    is_pinned: form.value.is_pinned,
    status: form.value.status,
    author: form.value.author.trim() || 'ศูนย์ประสานงานวิจัยลุ่มน้ำกก มฟล.',
  }

  emit('save', payload)
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
    <!-- Hidden file inputs for direct MongoDB GridFS uploads -->
    <input ref="coverInputRef" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="hidden" @change="onCoverFileSelected" />
    <input ref="galleryInputRef" type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" class="hidden" @change="onGalleryFilesSelected" />

    <div class="flex flex-wrap items-center gap-3">
      <button type="button" :class="actionButtonClass" @click="emit('cancel')">
        <ArrowLeft class="h-3.5 w-3.5" />
        <span>กลับตารางข่าว</span>
      </button>
      <div class="min-w-0">
        <h2 class="text-[15px] font-bold text-slate-900 dark:text-white">{{ isEdit ? 'แก้ไขข่าวประชาสัมพันธ์' : 'สร้างข่าวประชาสัมพันธ์ใหม่' }}</h2>
        <p class="text-xs text-slate-500 dark:text-[#98A2A8]">จัดการข้อมูลข่าวสาร แจ้งเตือนคุณภาพน้ำ และรูปภาพประกอบสำหรับเผยแพร่หน้าเว็บไซต์</p>
      </div>
    </div>

    <div class="grid items-start gap-4 lg:grid-cols-[1.35fr_1fr]">
      <!-- Content -->
      <section :class="adminCardClass" class="space-y-4 p-5">
        <div class="flex items-center justify-between gap-3">
          <h3 class="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
            <FileText class="h-4 w-4 text-[#0284C7]" /> ข้อมูลเนื้อหาข่าวประชาสัมพันธ์
          </h3>
          <span v-if="form.id" class="font-mono text-[11px] text-slate-500 dark:text-[#98A2A8]">{{ form.id }}</span>
        </div>

        <div>
          <label for="news-title" :class="fieldLabelClass">หัวข้อข่าวประชาสัมพันธ์ <span class="text-rose-600">*</span></label>
          <input id="news-title" v-model="form.title" type="text" placeholder="เช่น แจ้งผลตรวจคุณภาพน้ำแม่น้ำกก รอบเดือนตุลาคม 2569" :class="fieldClass" required />
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label for="news-category" :class="fieldLabelClass">หมวดหมู่ข่าว <span class="text-rose-600">*</span></label>
            <select id="news-category" v-model="form.category" :class="fieldClass" class="cursor-pointer">
              <option v-for="cat in NEWS_CATEGORIES.filter((c) => c.value !== 'all')" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
            </select>
          </div>
          <div>
            <label for="news-community" :class="fieldLabelClass">ชุมชนเป้าหมาย <span class="text-rose-600">*</span></label>
            <select id="news-community" v-model="form.community_id" :class="fieldClass" class="cursor-pointer">
              <option v-for="comm in COMMUNITY_OPTIONS" :key="comm.value" :value="comm.value">{{ comm.label }}</option>
            </select>
          </div>
        </div>

        <div>
          <label for="news-summary" :class="fieldLabelClass">สรุปใจความสำคัญ (แสดงบนการ์ดข่าว)</label>
          <textarea id="news-summary" v-model="form.summary" rows="2" placeholder="ข้อความสรุป 1-2 ประโยคเพื่อให้ประชาชนอ่านเข้าใจได้อย่างรวดเร็ว..." :class="fieldClass" />
        </div>

        <div>
          <div class="flex items-center justify-between gap-3">
            <label for="news-content" :class="fieldLabelClass">เนื้อหาข่าวประชาสัมพันธ์ <span class="text-rose-600">*</span></label>
            <span class="mb-1.5 text-[11px] text-slate-500 dark:text-[#98A2A8]">ภาษาชาวบ้านเข้าใจง่าย</span>
          </div>
          <textarea id="news-content" v-model="form.content" rows="14" placeholder="รายละเอียดผลการตรวจ คำแนะนำ แผนการลงพื้นที่ หรือข้อมูลวิชาการ..." :class="fieldClass" class="leading-relaxed" required />
        </div>
      </section>

      <div class="min-w-0 space-y-4">
        <!-- Images -->
        <section :class="adminCardClass" class="space-y-3 p-5">
          <h3 class="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
            <ImageIcon class="h-4 w-4 text-[#0284C7]" /> ภาพปกข่าวและรูปภาพประกอบ
          </h3>

          <p v-if="uploadError" role="alert" class="flex items-center justify-between gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
            <span>{{ uploadError }}</span>
            <button type="button" class="font-bold" @click="uploadError = null">ปิด</button>
          </p>

          <div>
            <div :class="fieldLabelClass">ภาพปกหลัก • 16:9</div>
            <div class="relative aspect-video w-full overflow-hidden rounded-xl border-2 border-dashed border-[#0284C7] bg-slate-100 dark:bg-[#141416]">
              <img v-if="form.cover_image_url" :src="form.cover_image_url" alt="ภาพปกข่าว" class="h-full w-full object-cover" />
              <button
                type="button"
                class="absolute cursor-pointer text-xs font-semibold disabled:opacity-60"
                :class="form.cover_image_url ? 'bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-lg bg-slate-900/85 px-2.5 py-1 text-white hover:bg-slate-900' : 'inset-0 flex flex-col items-center justify-center gap-1.5 text-[#0369A1] dark:text-sky-400'"
                :disabled="uploadingCover"
                @click="coverInputRef?.click()"
              >
                <RefreshCw v-if="uploadingCover" class="h-4 w-4 shrink-0 animate-spin" />
                <CloudUpload v-else-if="!form.cover_image_url" class="h-5 w-5" />
                <Check v-else class="h-3.5 w-3.5 shrink-0" />
                <template v-if="uploadingCover">กำลังอัปโหลด...</template>
                <template v-else-if="form.cover_image_url">
                  <span class="truncate">{{ coverFileName }}</span>
                  <span class="shrink-0">(เปลี่ยนภาพปก)</span>
                </template>
                <template v-else>เลือกภาพปก</template>
              </button>
              <button
                v-if="form.cover_image_url"
                type="button"
                aria-label="ลบภาพปก"
                title="ลบภาพปก"
                class="absolute right-2 top-2 cursor-pointer rounded-lg bg-slate-900/85 p-1.5 text-white hover:bg-rose-600"
                @click="removeCoverPhoto"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
            <p class="mt-1.5 text-[11px] text-slate-500 dark:text-[#98A2A8]">PNG, JPG หรือ WebP ขนาดไม่เกิน 10 MB</p>

            <div class="mt-2 flex flex-wrap items-center gap-1.5">
              <span class="text-[11px] text-slate-500 dark:text-[#98A2A8]">ภาพชุดด่วน:</span>
              <button
                v-for="preset in presetCovers"
                :key="preset.url"
                type="button"
                class="cursor-pointer rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600 transition hover:border-[#0284C7] hover:text-[#0369A1] dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-slate-300"
                @click="form.cover_image_url = preset.url"
              >
                {{ preset.label }}
              </button>
              <button type="button" class="cursor-pointer text-[11px] font-semibold text-[#0369A1] hover:underline dark:text-sky-400" @click="showCustomUrlInput = !showCustomUrlInput">
                {{ showCustomUrlInput ? 'ซ่อนช่อง URL' : 'ระบุ URL เอง' }}
              </button>
            </div>
            <input
              v-if="showCustomUrlInput"
              v-model="form.cover_image_url"
              type="text"
              aria-label="URL ภาพปก"
              placeholder="/api/news/photo/... หรือ https://..."
              :class="fieldClass"
              class="mt-2 font-mono"
            />
          </div>

          <div>
            <div :class="fieldLabelClass">รูปภาพประกอบในเนื้อหาข่าว</div>
            <div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
              <div
                v-for="(url, idx) in galleryUrls"
                :key="idx"
                class="group relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-[#2C2C2E] dark:bg-[#141416]"
              >
                <img :src="url" :alt="`ภาพประกอบ ${idx + 1}`" class="h-full w-full object-cover" />
                <button
                  type="button"
                  title="ลบภาพนี้"
                  aria-label="ลบภาพนี้"
                  class="absolute right-1 top-1 cursor-pointer rounded-md bg-slate-900/85 p-1 text-white transition hover:bg-rose-600 sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
                  @click="removeGalleryPhoto(idx)"
                >
                  <Trash2 class="h-3 w-3" />
                </button>
              </div>
              <button
                type="button"
                class="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-slate-300 text-[11px] font-semibold text-[#0369A1] transition hover:border-[#0284C7] disabled:opacity-60 dark:border-[#2C2C2E] dark:text-sky-400"
                :disabled="uploadingGallery"
                @click="galleryInputRef?.click()"
              >
                <RefreshCw v-if="uploadingGallery" class="h-4 w-4 animate-spin" />
                <Plus v-else class="h-4 w-4" />
                <span>{{ uploadingGallery ? 'กำลังอัปโหลด' : 'เพิ่มรูป' }}</span>
              </button>
            </div>
          </div>
        </section>

        <!-- Publishing -->
        <section :class="adminCardClass" class="space-y-3 p-5">
          <h3 class="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
            <Settings class="h-4 w-4 text-[#0284C7]" /> ตั้งค่าการเผยแพร่และปักหมุด
          </h3>

          <label class="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3 dark:border-orange-900/60 dark:bg-orange-950/30">
            <span class="min-w-0">
              <span class="flex items-center gap-1.5 text-xs font-bold text-orange-800 dark:text-orange-300">
                <Pin class="h-3.5 w-3.5" /> ปักหมุดเป็นข่าวสำคัญด้านบนสุด
              </span>
              <span class="mt-0.5 block text-[11px] text-orange-800 dark:text-orange-300/80">แสดงเด่นบนสุดของหน้าข่าวสาร</span>
            </span>
            <input v-model="form.is_pinned" type="checkbox" class="peer sr-only" />
            <span class="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-[#EA7A0B] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#EA7A0B] after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:after:translate-x-5 dark:bg-slate-600" />
          </label>

          <fieldset>
            <legend :class="fieldLabelClass">สถานะการเผยแพร่</legend>
            <div class="grid grid-cols-2 gap-2">
              <label
                v-for="option in statusOptions"
                :key="option.value"
                class="flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-xs font-semibold transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#0284C7]"
                :class="form.status === option.value ? option.active : 'border-slate-200 text-slate-600 dark:border-[#2C2C2E] dark:text-slate-300'"
              >
                <input v-model="form.status" type="radio" :value="option.value" class="sr-only" />
                <component :is="form.status === option.value ? CircleCheck : Circle" class="h-3.5 w-3.5 shrink-0" />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </fieldset>

          <div>
            <label for="news-author" :class="fieldLabelClass">ผู้เขียน / แหล่งที่มา</label>
            <input id="news-author" v-model="form.author" type="text" placeholder="ศูนย์ประสานงานวิจัยลุ่มน้ำกก มฟล." :class="fieldClass" />
          </div>

          <p v-if="validationError" role="alert" class="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{{ validationError }}</p>
          <p v-if="saveError" role="alert" class="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{{ saveError }}</p>

          <div class="grid grid-cols-[1fr_2fr] gap-2.5 border-t border-slate-100 pt-3 dark:border-[#2C2C2E]">
            <button type="button" :class="actionButtonClass" class="py-2.5!" @click="emit('cancel')">ยกเลิก</button>
            <button
              type="submit"
              class="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold text-white transition disabled:opacity-50"
              :class="form.status === 'draft' ? 'bg-slate-700 hover:bg-slate-800 dark:bg-slate-600' : 'bg-[#16A34A] hover:bg-[#15803D]'"
              :disabled="saving || uploadingCover || uploadingGallery"
            >
              <RefreshCw v-if="saving" class="h-4 w-4 animate-spin" />
              <Save v-else-if="form.status === 'draft'" class="h-4 w-4" />
              <Send v-else class="h-4 w-4" />
              <span>{{ form.status === 'draft' ? 'บันทึกฉบับร่าง' : 'บันทึกและเผยแพร่ข่าว' }}</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  </form>
</template>
