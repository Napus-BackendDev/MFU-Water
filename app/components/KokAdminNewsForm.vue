<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowLeft, Check, CloudUpload, FileText, Image as ImageIcon, Pin, Plus, RefreshCw, Send, Trash2 } from 'lucide-vue-next'
import { actionButtonClass, adminCardClass, fieldClass, fieldLabelClass } from '../utils/admin-ui'
import {
  COMMUNITY_OPTIONS,
  NEWS_CATEGORIES,
  type NewsArticle,
  type NewsCategory,
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

const form = ref<{
  id?: string
  title: string
  category: NewsCategory
  community_id: string
  summary: string
  content: string
  cover_image_url: string
  is_pinned: boolean
  author: string
}>({
  title: '',
  category: 'water',
  community_id: 'all',
  summary: '',
  content: '',
  cover_image_url: '',
  is_pinned: false,
  author: 'ศูนย์ประสานงานวิจัยลุ่มน้ำกก มฟล.',
})

const galleryUrls = ref<string[]>([])

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
        cover_image_url: val.cover_image_url || '',
        is_pinned: !!val.is_pinned,
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
        cover_image_url: '',
        is_pinned: false,
        author: 'ศูนย์ประสานงานวิจัยลุ่มน้ำกก มฟล.',
      }
      galleryUrls.value = []
    }
  },
  { immediate: true }
)

const validationError = ref<string | null>(null)

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
    status: 'published',
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
            <div class="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
              <div class="text-xs font-semibold text-slate-700 dark:text-slate-200">ภาพปกหลัก • 16:9</div>
              <span class="text-[11px] font-medium text-[#0369A1] dark:text-sky-400">ขนาดแนะนำ 1280 × 720 px (หรือ 1920 × 1080 px)</span>
            </div>
            <div class="relative aspect-video w-full overflow-hidden rounded-xl border-2 border-dashed border-[#0284C7] bg-slate-100 dark:bg-[#141416]">
              <img v-if="form.cover_image_url" :src="form.cover_image_url" alt="ภาพปกข่าว" class="h-full w-full object-cover" />
              <button
                type="button"
                class="absolute cursor-pointer text-xs font-semibold disabled:opacity-60"
                :class="form.cover_image_url ? 'bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-lg bg-slate-900/85 px-2.5 py-1 text-white hover:bg-slate-900' : 'inset-0 flex flex-col items-center justify-center gap-1 text-[#0369A1] dark:text-sky-400'"
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
                <template v-else>
                  <span>อัพภาพหน้าปก</span>
                  <span class="text-[11px] font-normal text-slate-500 dark:text-[#98A2A8]">อัตราส่วน 16:9 • 1280 × 720 px พอดีกับการ์ดข่าว</span>
                </template>
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
            <p class="mt-1.5 text-[11px] text-slate-500 dark:text-[#98A2A8]">รองรับ PNG, JPG หรือ WebP ขนาดไฟล์ไม่เกิน 10 MB (แสดงผลบนการ์ดข่าวและหัวบทความแบบ 16:9)</p>
          </div>

          <div>
            <div class="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
              <div class="text-xs font-semibold text-slate-700 dark:text-slate-200">รูปภาพประกอบในเนื้อหาข่าว • 16:9</div>
              <span class="text-[11px] font-medium text-[#0369A1] dark:text-sky-400">ขนาดแนะนำ 1280 × 720 px (หรือ 1200 × 675 px)</span>
            </div>
            <div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
              <div
                v-for="(url, idx) in galleryUrls"
                :key="idx"
                class="group relative aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-[#2C2C2E] dark:bg-[#141416]"
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
                class="flex aspect-video cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-slate-300 text-[11px] font-semibold text-[#0369A1] transition hover:border-[#0284C7] disabled:opacity-60 dark:border-[#2C2C2E] dark:text-sky-400"
                :disabled="uploadingGallery"
                @click="galleryInputRef?.click()"
              >
                <RefreshCw v-if="uploadingGallery" class="h-4 w-4 animate-spin" />
                <Plus v-else class="h-4 w-4" />
                <span>{{ uploadingGallery ? 'กำลังอัปโหลด' : 'เพิ่มรูป' }}</span>
                <span class="text-[10px] font-normal text-slate-400 dark:text-slate-500">1280 × 720 px</span>
              </button>
            </div>
            <p class="mt-1.5 text-[11px] text-slate-500 dark:text-[#98A2A8]">แสดงผลในแกลเลอรีท้ายข่าวแบบ 16:9 (กดขยายเต็มจอได้) • ไม่เกิน 10 MB ต่อภาพ</p>
          </div>
        </section>

        <!-- Pin, Author & Submit Actions -->
        <section :class="adminCardClass" class="space-y-3 p-5">
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
              class="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#16A34A] py-2.5 text-xs font-bold text-white transition hover:bg-[#15803D] disabled:opacity-50"
              :disabled="saving || uploadingCover || uploadingGallery"
            >
              <RefreshCw v-if="saving" class="h-4 w-4 animate-spin" />
              <Send v-else class="h-4 w-4" />
              <span>บันทึกและเผยแพร่ข่าว</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  </form>
</template>
