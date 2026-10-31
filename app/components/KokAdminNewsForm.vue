<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CloudUpload,
  Database,
  FileText,
  Image as ImageIcon,
  Pin,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-vue-next'
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

// Handle cover image file upload to MongoDB
async function onCoverFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingCover.value = true
  uploadError.value = null
  try {
    const url = await uploadNewsPhoto(file)
    form.value.cover_image_url = url
  } catch (err: any) {
    uploadError.value = err?.message || 'อัปโหลดภาพหน้าปกลง MongoDB ไม่สำเร็จ'
  } finally {
    uploadingCover.value = false
    if (coverInputRef.value) coverInputRef.value.value = ''
  }
}

// Handle gallery images file upload to MongoDB
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
  <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-[#2C2C2E] dark:bg-[#1E1E1E] space-y-6">
    <!-- Hidden file inputs for direct MongoDB GridFS uploads -->
    <input
      ref="coverInputRef"
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif"
      class="hidden"
      @change="onCoverFileSelected"
    />
    <input
      ref="galleryInputRef"
      type="file"
      multiple
      accept="image/png,image/jpeg,image/webp,image/gif"
      class="hidden"
      @change="onGalleryFilesSelected"
    />

    <!-- Header -->
    <div class="flex items-center justify-between border-b border-slate-100 dark:border-[#2C2C2E] pb-4">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-slate-300 dark:hover:bg-[#2E2E30] transition cursor-pointer"
          @click="emit('cancel')"
        >
          <ArrowLeft class="h-4 w-4" />
        </button>
        <div>
          <h2 class="text-base font-bold text-slate-900 dark:text-white sm:text-lg">
            {{ isEdit ? `แก้ไขข่าวประชาสัมพันธ์ (${form.id})` : 'สร้างข่าวประชาสัมพันธ์ใหม่' }}
          </h2>
          <p class="text-xs text-slate-500 dark:text-[#98A2A8]">
            กำหนดหัวข้อ เนื้อหา รูปภาพ (อัปโหลดเข้า MongoDB GridFS โดยตรง) และพื้นที่เป้าหมาย
          </p>
        </div>
      </div>

      <button
        type="button"
        class="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
        @click="emit('cancel')"
      >
        <X class="h-5 w-5" />
      </button>
    </div>

    <!-- Error notices -->
    <div
      v-if="validationError"
      class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
    >
      {{ validationError }}
    </div>
    <div
      v-if="uploadError"
      class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 flex items-center justify-between"
    >
      <span>{{ uploadError }}</span>
      <button type="button" class="text-rose-600 font-bold" @click="uploadError = null">ปิด</button>
    </div>

    <!-- Form Grid -->
    <form class="space-y-6" @submit.prevent="handleSubmit">
      <!-- Row 1: Title -->
      <div>
        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          หัวข้อข่าวประชาสัมพันธ์ <span class="text-rose-500">*</span>
        </label>
        <input
          v-model="form.title"
          type="text"
          placeholder="เช่น แจ้งผลตรวจคุณภาพน้ำแม่น้ำกก รอบเดือนตุลาคม 2569"
          class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-white outline-none focus:border-[#0284C7] dark:focus:border-[#00E5FF]"
          required
        />
      </div>

      <!-- Row 2: Category & Community -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            หมวดหมู่ข่าว <span class="text-rose-500">*</span>
          </label>
          <select
            v-model="form.category"
            class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-white outline-none cursor-pointer"
          >
            <option v-for="cat in NEWS_CATEGORIES.filter((c) => c.value !== 'all')" :key="cat.value" :value="cat.value">
              {{ cat.label }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            พื้นที่ชุมชนเป้าหมาย <span class="text-rose-500">*</span>
          </label>
          <select
            v-model="form.community_id"
            class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-white outline-none cursor-pointer"
          >
            <option v-for="comm in COMMUNITY_OPTIONS" :key="comm.value" :value="comm.value">
              {{ comm.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- Row 3: Cover Image (Direct Upload to MongoDB GridFS) -->
      <div class="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-[#2C2C2E] dark:bg-[#252525]/40 space-y-3">
        <div class="flex items-center justify-between">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Database class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>ภาพหน้าปก (Cover Image · บันทึกใน MongoDB GridFS)</span>
          </label>
          <button
            type="button"
            class="text-[11px] text-[#0284C7] dark:text-[#00E5FF] hover:underline cursor-pointer"
            @click="showCustomUrlInput = !showCustomUrlInput"
          >
            {{ showCustomUrlInput ? 'ซ่อนช่อง URL' : 'ระบุ URL เอง' }}
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          <!-- Left: Upload Action & Presets -->
          <div class="md:col-span-8 space-y-3">
            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                class="wv-btn-primary flex items-center gap-2 text-xs font-semibold py-2 px-4 rounded-xl cursor-pointer shadow-xs"
                :disabled="uploadingCover"
                @click="coverInputRef?.click()"
              >
                <RefreshCw v-if="uploadingCover" class="h-4 w-4 animate-spin" />
                <CloudUpload v-else class="h-4 w-4" />
                <span>{{ uploadingCover ? 'กำลังบันทึกลง MongoDB...' : 'อัปโหลดภาพหน้าปกเข้า MongoDB' }}</span>
              </button>

              <button
                v-if="form.cover_image_url"
                type="button"
                class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 transition cursor-pointer"
                @click="removeCoverPhoto"
              >
                ลบภาพหน้าปก
              </button>
            </div>

            <p class="text-[11px] text-slate-500 dark:text-[#98A2A8]">
              รองรับไฟล์ PNG, JPG, WebP (ขนาดสูงสุด 10 MB) ไฟล์จะถูกจัดเก็บเข้า MongoDB GridFS โดยตรง
            </p>

            <!-- Custom URL Input (Optional) -->
            <div v-if="showCustomUrlInput" class="pt-1">
              <input
                v-model="form.cover_image_url"
                type="text"
                placeholder="/api/news/photo/... หรือ https://..."
                class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs text-slate-900 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-white outline-none font-mono"
              />
            </div>

            <!-- Quick preset buttons -->
            <div class="flex flex-wrap items-center gap-1.5 pt-1">
              <span class="text-[10px] text-slate-400">เลือกภาพชุดด่วน:</span>
              <button
                v-for="preset in presetCovers"
                :key="preset.url"
                type="button"
                class="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-600 hover:border-[#0284C7] hover:text-[#0284C7] dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-slate-300 cursor-pointer transition"
                @click="form.cover_image_url = preset.url"
              >
                {{ preset.label }}
              </button>
            </div>
          </div>

          <!-- Right: Cover Preview Box -->
          <div class="md:col-span-4">
            <div class="relative aspect-video w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100 dark:border-[#2C2C2E] dark:bg-slate-900 shadow-sm flex items-center justify-center">
              <img
                v-if="form.cover_image_url"
                :src="form.cover_image_url"
                alt="ภาพหน้าปก"
                class="w-full h-full object-cover"
              />
              <div v-else class="text-center p-4 text-slate-400 text-xs">
                <ImageIcon class="h-6 w-6 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                <span>ยังไม่มีภาพหน้าปก</span>
              </div>

              <!-- MongoDB GridFS Badge -->
              <div
                v-if="form.cover_image_url && form.cover_image_url.includes('/api/news/photo/')"
                class="absolute bottom-2 left-2 rounded-md bg-emerald-600/90 text-white text-[9px] font-bold px-2 py-0.5 backdrop-blur-xs flex items-center gap-1 shadow-sm"
              >
                <Database class="h-2.5 w-2.5" />
                <span>MongoDB GridFS</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Row 4: Summary -->
      <div>
        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          สรุปใจความสำคัญ (Summary สั้นๆ สำหรับการ์ดหน้าแรก)
        </label>
        <textarea
          v-model="form.summary"
          rows="2"
          placeholder="ระบุข้อความสรุป 1-2 ประโยคเพื่อให้ประชาชนอ่านเข้าใจได้อย่างรวดเร็ว..."
          class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-white outline-none focus:border-[#0284C7] dark:focus:border-[#00E5FF]"
        />
      </div>

      <!-- Row 5: Content -->
      <div>
        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          เนื้อหาข่าวฉบับเต็ม (Content) <span class="text-rose-500">*</span>
        </label>
        <textarea
          v-model="form.content"
          rows="6"
          placeholder="รายละเอียดผลการตรวจ คำแนะนำ แผนการลงพื้นที่ หรือข้อมูลวิชาการ..."
          class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-white outline-none focus:border-[#0284C7] dark:focus:border-[#00E5FF] leading-relaxed"
          required
        />
      </div>

      <!-- Row 6: Gallery Photos (Direct Upload to MongoDB GridFS) -->
      <div class="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-[#2C2C2E] dark:bg-[#252525]/40 space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ImageIcon class="h-3.5 w-3.5 text-[#0284C7] dark:text-[#00E5FF]" />
              <span>ภาพประกอบเพิ่มเติมในแกลเลอรี (บันทึกใน MongoDB GridFS)</span>
            </label>
            <p class="text-[11px] text-slate-500 dark:text-[#98A2A8]">
              คลิกอัปโหลดเพื่อเลือกไฟล์ภาพจากคอมพิวเตอร์ ระบบจะบันทึกลง MongoDB อัตโนมัติ (เลือกพร้อมกันได้หลายไฟล์)
            </p>
          </div>

          <button
            type="button"
            class="wv-btn-primary flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-xl cursor-pointer shadow-xs"
            :disabled="uploadingGallery"
            @click="galleryInputRef?.click()"
          >
            <RefreshCw v-if="uploadingGallery" class="h-3.5 w-3.5 animate-spin" />
            <Plus v-else class="h-3.5 w-3.5" />
            <span>{{ uploadingGallery ? 'กำลังอัปโหลด...' : '+ เพิ่มภาพประกอบเข้า MongoDB' }}</span>
          </button>
        </div>

        <!-- Gallery Thumbnails Grid -->
        <div v-if="galleryUrls.length > 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
          <div
            v-for="(url, idx) in galleryUrls"
            :key="idx"
            class="group relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100 dark:border-[#2C2C2E] dark:bg-slate-900 shadow-xs"
          >
            <img :src="url" :alt="`ภาพประกอบ ${idx + 1}`" class="w-full h-full object-cover" />
            
            <div class="absolute top-1.5 left-1.5 rounded-md bg-black/60 text-white text-[10px] px-1.5 py-0.2 backdrop-blur-xs">
              #{{ idx + 1 }}
            </div>

            <!-- Remove gallery item button -->
            <button
              type="button"
              class="absolute top-1.5 right-1.5 rounded-lg bg-rose-600 text-white p-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition cursor-pointer shadow-sm"
              title="ลบภาพนี้"
              @click="removeGalleryPhoto(idx)"
            >
              <Trash2 class="h-3 w-3" />
            </button>
          </div>
        </div>

        <div v-else class="py-6 text-center border border-dashed border-slate-300 dark:border-[#2C2C2E] rounded-xl text-slate-400 text-xs">
          ยังไม่มีภาพประกอบเพิ่มเติม คลิกปุ่ม "+ เพิ่มภาพประกอบเข้า MongoDB" เพื่อเลือกภาพ
        </div>
      </div>

      <!-- Row 7: Author & Status & Pin -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-[#2C2C2E]">
        <!-- Author -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            ผู้เขียน / แหล่งที่มา
          </label>
          <input
            v-model="form.author"
            type="text"
            placeholder="ศูนย์ประสานงานวิจัยลุ่มน้ำกก มฟล."
            class="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-white outline-none"
          />
        </div>

        <!-- Status -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            สถานะการเผยแพร่
          </label>
          <div class="flex items-center gap-2 pt-1">
            <label class="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                v-model="form.status"
                type="radio"
                value="published"
                class="accent-emerald-600"
              />
              <span>เผยแพร่ทันที</span>
            </label>
            <label class="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                v-model="form.status"
                type="radio"
                value="draft"
                class="accent-amber-600"
              />
              <span>บันทึกฉบับร่าง</span>
            </label>
          </div>
        </div>

        <!-- Pin Toggle -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            ปักหมุดข่าวสำคัญ (Pin to Top)
          </label>
          <label class="inline-flex items-center gap-2 pt-1 cursor-pointer">
            <input
              v-model="form.is_pinned"
              type="checkbox"
              class="h-4 w-4 rounded-sm border-slate-300 text-amber-600 focus:ring-amber-500 accent-amber-500 cursor-pointer"
            />
            <span class="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Pin class="h-3.5 w-3.5 text-amber-500" />
              แสดงเป็นการ์ดไฮไลท์หน้าแรก
            </span>
          </label>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-[#2C2C2E]">
        <button
          type="button"
          class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-slate-200 dark:hover:bg-[#2E2E30] transition cursor-pointer"
          @click="emit('cancel')"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          class="wv-btn-primary flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold cursor-pointer"
          :disabled="saving || uploadingCover || uploadingGallery"
        >
          <RefreshCw v-if="saving" class="h-4 w-4 animate-spin" />
          <Check v-else class="h-4 w-4" />
          <span>{{ isEdit ? 'บันทึกการแก้ไข' : 'สร้างข่าวประชาสัมพันธ์' }}</span>
        </button>
      </div>
    </form>
  </div>
</template>
