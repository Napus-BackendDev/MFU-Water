<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  ChevronDown,
  ChevronUp,
  CloudUpload,
  Copy,
  FileText,
  Image as ImageIcon,
  Images,
  PanelLeft,
  PanelRight,
  PanelTop,
  Paperclip,
  Pin,
  Plus,
  RefreshCw,
  Send,
  Tag,
  Trash2,
} from 'lucide-vue-next'
import { actionButtonClass, adminCardClass, fieldClass, fieldLabelClass } from '../utils/admin-ui'
import {
  COMMUNITY_OPTIONS,
  NEWS_CATEGORIES,
  RESEARCH_GROUP_TAGS,
  type NewsArticle,
  type NewsCategory,
  type NewsContentBlock,
  type NewsImageLayout,
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

const { uploadNewsPhoto, uploadNewsFile } = useAdminNews()

let uidSeq = 0
const nextId = (prefix = 'blk') => `${prefix}-${Date.now()}-${++uidSeq}`
const makeTextBlock = (heading = '', body = ''): NewsContentBlock => ({
  id: nextId('txt'),
  type: 'text',
  heading,
  body,
})

const coverInputRef = ref<HTMLInputElement | null>(null)
const blockImageInputRef = ref<HTMLInputElement | null>(null)
const blockGalleryInputRef = ref<HTMLInputElement | null>(null)
const blockFileInputRef = ref<HTMLInputElement | null>(null)

const pendingBlockId = ref<string | null>(null)
const uploadingCover = ref(false)
const uploadingBlockId = ref<string | null>(null)
const uploadError = ref<string | null>(null)
const validationError = ref<string | null>(null)
const fileLinkDraft = ref<Record<string, string>>({})

const form = ref<{
  id?: string
  title: string
  category: NewsCategory
  community_id: string
  summary: string
  cover_image_url: string
  is_pinned: boolean
  author: string
}>({
  title: '',
  category: 'water',
  community_id: 'all',
  summary: '',
  cover_image_url: '',
  is_pinned: false,
  author: 'ศูนย์ประสานงานวิจัยลุ่มน้ำกก มฟล.',
})

const researchTags = ref<number[]>([])
const blocks = ref<NewsContentBlock[]>([makeTextBlock()])
const activeBlockId = ref<string | null>(blocks.value[0]?.id ?? null)

function cloneBlocks(list: NewsContentBlock[]): NewsContentBlock[] {
  return list.map((b) => ({
    ...b,
    ...(b.type === 'gallery' ? { images: [...b.images] } : {}),
    ...(b.type === 'file' ? { files: b.files.map((f) => ({ ...f })) } : {}),
  }))
}

watch(
  () => props.initialData,
  (val) => {
    validationError.value = null
    uploadError.value = null
    if (val) {
      form.value = {
        id: val.id,
        title: val.title || '',
        category: val.category || 'water',
        community_id: val.community_id || 'all',
        summary: val.summary || '',
        cover_image_url: val.cover_image_url || '',
        is_pinned: !!val.is_pinned,
        author: val.author || 'ศูนย์ประสานงานวิจัยลุ่มน้ำกก มฟล.',
      }
      researchTags.value = Array.isArray(val.research_tags) ? [...val.research_tags] : []
      if (Array.isArray(val.content_blocks) && val.content_blocks.length > 0) {
        blocks.value = cloneBlocks(val.content_blocks)
      } else {
        const legacy: NewsContentBlock[] = []
        if (val.content?.trim()) legacy.push(makeTextBlock('', val.content))
        if (Array.isArray(val.gallery_image_urls) && val.gallery_image_urls.length > 0) {
          legacy.push({
            id: nextId('gal'),
            type: 'gallery',
            columns: 2,
            images: [...val.gallery_image_urls],
            caption: '',
          })
        }
        blocks.value = legacy.length ? legacy : [makeTextBlock()]
      }
    } else {
      form.value = {
        title: '',
        category: 'water',
        community_id: 'all',
        summary: '',
        cover_image_url: '',
        is_pinned: false,
        author: 'ศูนย์ประสานงานวิจัยลุ่มน้ำกก มฟล.',
      }
      researchTags.value = []
      blocks.value = [makeTextBlock()]
    }
    activeBlockId.value = blocks.value[0]?.id ?? null
  },
  { immediate: true },
)

const isUploadingAny = computed(() => uploadingCover.value || uploadingBlockId.value !== null)

function toggleResearchTag(num: number) {
  if (researchTags.value.includes(num)) {
    researchTags.value = researchTags.value.filter((t) => t !== num)
  } else {
    researchTags.value = [...researchTags.value, num].sort((a, b) => a - b)
  }
}

function addBlock(type: NewsContentBlock['type']) {
  let created: NewsContentBlock
  if (type === 'text') {
    created = makeTextBlock()
  } else if (type === 'image_text') {
    created = { id: nextId('img'), type: 'image_text', layout: 'left', imageUrl: '', caption: '', heading: '', body: '' }
  } else if (type === 'gallery') {
    created = { id: nextId('gal'), type: 'gallery', columns: 2, images: [], caption: '' }
  } else {
    created = { id: nextId('file'), type: 'file', files: [] }
  }

  const activeIdx = blocks.value.findIndex((b) => b.id === activeBlockId.value)
  const insertAt = activeIdx >= 0 ? activeIdx + 1 : blocks.value.length
  blocks.value.splice(insertAt, 0, created)
  activeBlockId.value = created.id
}

function moveBlock(index: number, delta: -1 | 1) {
  const nextIndex = index + delta
  if (nextIndex < 0 || nextIndex >= blocks.value.length) return
  const [item] = blocks.value.splice(index, 1)
  if (!item) return
  blocks.value.splice(nextIndex, 0, item)
  activeBlockId.value = item.id
}

function duplicateBlock(index: number) {
  const src = blocks.value[index]
  if (!src) return
  const copy = cloneBlocks([src])[0]!
  copy.id = nextId(src.type.slice(0, 3))
  blocks.value.splice(index + 1, 0, copy)
  activeBlockId.value = copy.id
}

function removeBlock(index: number) {
  const removed = blocks.value[index]
  blocks.value.splice(index, 1)
  if (blocks.value.length === 0) {
    const fresh = makeTextBlock()
    blocks.value.push(fresh)
    activeBlockId.value = fresh.id
    return
  }
  if (removed && activeBlockId.value === removed.id) {
    activeBlockId.value = blocks.value[Math.min(index, blocks.value.length - 1)]?.id ?? null
  }
}

async function onCoverFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingCover.value = true
  uploadError.value = null
  try {
    form.value.cover_image_url = await uploadNewsPhoto(file)
  } catch (err: any) {
    uploadError.value = err?.message || 'อัปโหลดภาพหน้าปกไม่สำเร็จ ลองใหม่อีกครั้ง'
  } finally {
    uploadingCover.value = false
    if (coverInputRef.value) coverInputRef.value.value = ''
  }
}

function triggerBlockImageUpload(blockId: string) {
  pendingBlockId.value = blockId
  activeBlockId.value = blockId
  blockImageInputRef.value?.click()
}

function triggerBlockGalleryUpload(blockId: string) {
  pendingBlockId.value = blockId
  activeBlockId.value = blockId
  blockGalleryInputRef.value?.click()
}

function triggerBlockFileAttach(blockId: string) {
  pendingBlockId.value = blockId
  activeBlockId.value = blockId
  blockFileInputRef.value?.click()
}

async function onBlockImageSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  const targetId = pendingBlockId.value
  if (!file || !targetId) return
  uploadingBlockId.value = targetId
  uploadError.value = null
  try {
    const url = await uploadNewsPhoto(file)
    const block = blocks.value.find((b) => b.id === targetId)
    if (block && block.type === 'image_text') block.imageUrl = url
  } catch (err: any) {
    uploadError.value = err?.message || 'อัปโหลดภาพประกอบไม่สำเร็จ'
  } finally {
    uploadingBlockId.value = null
    if (blockImageInputRef.value) blockImageInputRef.value.value = ''
  }
}

async function onBlockGallerySelected(e: Event) {
  const files = (e.target as HTMLInputElement).files
  const targetId = pendingBlockId.value
  if (!files || !files.length || !targetId) return
  uploadingBlockId.value = targetId
  uploadError.value = null
  try {
    const block = blocks.value.find((b) => b.id === targetId)
    if (block && block.type === 'gallery') {
      for (let i = 0; i < files.length; i++) {
        const url = await uploadNewsPhoto(files[i]!)
        block.images.push(url)
      }
    }
  } catch (err: any) {
    uploadError.value = err?.message || 'อัปโหลดภาพประกอบบางภาพไม่สำเร็จ'
  } finally {
    uploadingBlockId.value = null
    if (blockGalleryInputRef.value) blockGalleryInputRef.value.value = ''
  }
}

const maxAttachmentBytes = 5 * 1024 * 1024

async function onBlockFileSelected(e: Event) {
  const files = (e.target as HTMLInputElement).files
  const targetId = pendingBlockId.value
  if (!files || !files.length || !targetId) return
  uploadError.value = null
  const block = blocks.value.find((b) => b.id === targetId)
  if (!block || block.type !== 'file') return
  uploadingBlockId.value = targetId
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!
      if (file.size > maxAttachmentBytes) {
        uploadError.value = `ไฟล์ "${file.name}" มีขนาดเกิน 5 MB กรุณาย่อไฟล์หรือวางลิงก์แทน`
        continue
      }
      const uploaded = await uploadNewsFile(file)
      block.files.push({ name: file.name, size: uploaded.size, url: uploaded.url })
    }
  } catch (err: any) {
    uploadError.value = err?.message || 'อัปโหลดไฟล์แนบไม่สำเร็จ'
  } finally {
    uploadingBlockId.value = null
    if (blockFileInputRef.value) blockFileInputRef.value.value = ''
  }
}

function addFileLink(block: Extract<NewsContentBlock, { type: 'file' }>) {
  const raw = (fileLinkDraft.value[block.id] || '').trim()
  if (!raw) return
  const cleanName = raw.split('/').pop()?.split('?')[0] || raw
  block.files.push({ name: cleanName, url: raw })
  fileLinkDraft.value = { ...fileLinkDraft.value, [block.id]: '' }
}

function formatBytes(size?: number): string {
  if (!size) return 'ลิงก์ภายนอก'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function blockLabel(type: NewsContentBlock['type']): string {
  if (type === 'text') return 'เนื้อหาข้อความ'
  if (type === 'image_text') return 'ภาพประกอบ + เนื้อหา'
  if (type === 'gallery') return 'แกลเลอรีรูปภาพ'
  return 'ไฟล์แนบ / เอกสาร'
}

const layoutChoices: Array<{ value: NewsImageLayout; label: string }> = [
  { value: 'top', label: 'ภาพข้างบน' },
  { value: 'left', label: 'ภาพซ้าย' },
  { value: 'right', label: 'ภาพขวา' },
]

function compileBlocksToText(list: NewsContentBlock[]): { content: string; gallery: string[] } {
  const chunks: string[] = []
  const gallery: string[] = []
  for (const b of list) {
    if (b.type === 'text') {
      if (b.heading?.trim()) chunks.push(b.heading.trim())
      if (b.body.trim()) chunks.push(b.body.trim())
    } else if (b.type === 'image_text') {
      if (b.imageUrl) gallery.push(b.imageUrl)
      if (b.heading?.trim()) chunks.push(b.heading.trim())
      if (b.body.trim()) chunks.push(b.body.trim())
      if (b.caption?.trim()) chunks.push(b.caption.trim())
    } else if (b.type === 'gallery') {
      gallery.push(...b.images.filter(Boolean))
      if (b.caption?.trim()) chunks.push(b.caption.trim())
    } else if (b.type === 'file') {
      const names = b.files.map((f) => f.name).filter(Boolean)
      if (names.length) chunks.push(`ไฟล์แนบ: ${names.join(', ')}`)
    }
  }
  return { content: chunks.join('\n\n'), gallery }
}

function handleSubmit() {
  validationError.value = null
  if (!form.value.title.trim()) {
    validationError.value = 'กรุณาระบุหัวข้อข่าวประชาสัมพันธ์'
    return
  }

  const { content, gallery } = compileBlocksToText(blocks.value)
  const hasMediaOrFile = Boolean(form.value.cover_image_url.trim()) || gallery.length > 0
    || blocks.value.some((b) => b.type === 'file' && b.files.length > 0)

  if (!content.trim() && !hasMediaOrFile) {
    validationError.value = 'กรุณาระบุเนื้อหาข่าว หรือเพิ่มภาพ/ไฟล์อย่างน้อย 1 ส่วน'
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
    content: content.trim() || form.value.title.trim(),
    cover_image_url: form.value.cover_image_url.trim(),
    gallery_image_urls: gallery,
    content_blocks: cloneBlocks(blocks.value),
    research_tags: [...researchTags.value].sort((a, b) => a - b),
    is_pinned: form.value.is_pinned,
    status: 'published',
    author: form.value.author.trim() || 'ศูนย์ประสานงานวิจัยลุ่มน้ำกก มฟล.',
  }

  emit('save', payload)
}
</script>

<template>
  <form class="mx-auto max-w-4xl space-y-4" @submit.prevent="handleSubmit">
    <!-- Hidden shared file inputs -->
    <input ref="coverInputRef" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="hidden" @change="onCoverFileSelected" />
    <input ref="blockImageInputRef" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="hidden" @change="onBlockImageSelected" />
    <input ref="blockGalleryInputRef" type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" class="hidden" @change="onBlockGallerySelected" />
    <input ref="blockFileInputRef" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.png,.jpg,.jpeg" class="hidden" @change="onBlockFileSelected" />

    <!-- Mobile Sticky Block Adder Bar (< sm) -->
    <div class="sticky top-2 z-20 flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-md backdrop-blur-xs sm:hidden dark:border-[#2C2C2E] dark:bg-[#1E1E1E]/95">
      <button type="button" :class="actionButtonClass" class="shrink-0 px-2.5! py-1.5! text-[11px]!" @click="addBlock('text')">
        <Plus class="h-3.5 w-3.5 text-[#0284C7]" /> เนื้อหา
      </button>
      <button type="button" :class="actionButtonClass" class="shrink-0 px-2.5! py-1.5! text-[11px]!" @click="addBlock('image_text')">
        <ImageIcon class="h-3.5 w-3.5 text-[#0284C7]" /> ภาพ + เนื้อหา
      </button>
      <button type="button" :class="actionButtonClass" class="shrink-0 px-2.5! py-1.5! text-[11px]!" @click="addBlock('gallery')">
        <Images class="h-3.5 w-3.5 text-[#0284C7]" /> แกลเลอรี
      </button>
      <button type="button" :class="actionButtonClass" class="shrink-0 px-2.5! py-1.5! text-[11px]!" @click="addBlock('file')">
        <Paperclip class="h-3.5 w-3.5 text-[#0284C7]" /> ไฟล์แนบ
      </button>
    </div>

    <div class="flex items-start gap-4">
      <!-- Main Google-Form Style Vertical Stack -->
      <div class="min-w-0 flex-1 space-y-4">
        <!-- Header & Cover Card -->
        <section
          :class="adminCardClass"
          class="space-y-4 border-t-4 border-t-[#0284C7] p-5 sm:p-6"
          aria-label="ส่วนหัวและข้อมูลหลักของข่าว"
        >
          <!-- Large Cover Photo Upload -->
          <div>
            <div class="mb-1.5 flex items-center justify-between gap-2">
              <span class="text-xs font-bold text-slate-600 dark:text-slate-300">ภาพปกข่าวขนาดใหญ่ (Cover • 16:9)</span>
              <span v-if="form.id" class="font-mono text-[11px] text-slate-400">{{ form.id }}</span>
            </div>

            <div
              v-if="form.cover_image_url"
              class="group relative aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-[#2C2C2E] dark:bg-[#141416]"
            >
              <img :src="form.cover_image_url" alt="ภาพปกข่าวประชาสัมพันธ์" class="h-full w-full object-cover" />
              <div class="absolute inset-x-0 bottom-0 flex items-center justify-end gap-2 bg-linear-to-t from-slate-950/80 via-slate-950/35 to-transparent p-3 sm:opacity-0 sm:focus-within:opacity-100 sm:group-hover:opacity-100 transition">
                <button
                  type="button"
                  class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-white"
                  @click="coverInputRef?.click()"
                >
                  <CloudUpload class="h-3.5 w-3.5" /> เปลี่ยนภาพปก
                </button>
                <button
                  type="button"
                  aria-label="ลบภาพหน้าปก"
                  class="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                  @click="form.cover_image_url = ''"
                >
                  <Trash2 class="h-3.5 w-3.5" /> ลบ
                </button>
              </div>
            </div>

            <button
              v-else
              type="button"
              :disabled="uploadingCover"
              class="flex aspect-[21/9] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 px-4 text-center transition hover:border-[#0284C7] hover:bg-sky-50/40 disabled:opacity-60 dark:border-[#2C2C2E] dark:bg-[#141416]"
              @click="coverInputRef?.click()"
            >
              <RefreshCw v-if="uploadingCover" class="h-6 w-6 animate-spin text-[#0284C7]" />
              <CloudUpload v-else class="h-7 w-7 text-[#0284C7]" />
              <span class="text-xs font-bold text-slate-700 dark:text-slate-200">
                {{ uploadingCover ? 'กำลังอัปโหลดภาพปก…' : 'คลิกเพื่อเพิ่มภาพปกขนาดใหญ่ด้านบนข่าว (16:9)' }}
              </span>
              <span class="text-[11px] text-slate-400">PNG, JPG หรือ WebP • ขนาดแนะนำ 1280 × 720 px</span>
            </button>
          </div>

          <!-- Title & Summary -->
          <div class="space-y-3 border-t border-slate-100 pt-4 dark:border-[#2C2C2E]">
            <div>
              <label for="news-title" :class="fieldLabelClass">หัวข้อข่าวประชาสัมพันธ์ <span class="text-rose-600">*</span></label>
              <input
                id="news-title"
                v-model="form.title"
                type="text"
                placeholder="เช่น แจ้งผลตรวจคุณภาพน้ำแม่น้ำกก รอบเดือนตุลาคม 2569"
                :class="fieldClass"
                class="text-base! font-bold!"
                required
              />
            </div>

            <div>
              <label for="news-summary" :class="fieldLabelClass">คำโปรย / สรุปใจความสำคัญ</label>
              <textarea
                id="news-summary"
                v-model="form.summary"
                rows="2"
                placeholder="ข้อความสรุปสั้น 1–2 ประโยคสำหรับแสดงบนการ์ดข่าว..."
                :class="fieldClass"
              />
            </div>
          </div>

          <!-- Category, Target Community & Author -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label for="news-category" :class="fieldLabelClass">หมวดหมู่ข่าว</label>
              <select id="news-category" v-model="form.category" :class="fieldClass" class="cursor-pointer">
                <option v-for="cat in NEWS_CATEGORIES.filter((c) => c.value !== 'all')" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
              </select>
            </div>
            <div>
              <label for="news-community" :class="fieldLabelClass">ชุมชนเป้าหมาย</label>
              <select id="news-community" v-model="form.community_id" :class="fieldClass" class="cursor-pointer">
                <option v-for="c in COMMUNITY_OPTIONS" :key="c.value" :value="c.value">{{ c.label }}</option>
              </select>
            </div>
            <div>
              <label for="news-author" :class="fieldLabelClass">ผู้เขียน / แหล่งที่มา</label>
              <input id="news-author" v-model="form.author" type="text" placeholder="ศูนย์ประสานงานวิจัยลุ่มน้ำกก มฟล." :class="fieldClass" />
            </div>
          </div>

          <!-- Pin Toggle & Research Group Tags (1–7) -->
          <div class="space-y-3 border-t border-slate-100 pt-4 dark:border-[#2C2C2E]">
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <span class="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <Tag class="h-3.5 w-3.5 text-[#0284C7]" />
                  <span>Tag กลุ่มวิจัย (เลือกได้หลายกลุ่ม)</span>
                </span>
                <span v-if="researchTags.length" class="text-[11px] font-medium text-[#0284C7] dark:text-sky-400">
                  เลือกแล้ว {{ researchTags.length }} กลุ่ม
                </span>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="tagNum in RESEARCH_GROUP_TAGS"
                  :key="tagNum"
                  type="button"
                  :aria-pressed="researchTags.includes(tagNum)"
                  class="cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition"
                  :class="researchTags.includes(tagNum)
                    ? 'border-[#0284C7] bg-[#0284C7] text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50/50 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-slate-300'"
                  @click="toggleResearchTag(tagNum)"
                >
                  กลุ่มวิจัยที่ {{ tagNum }}
                </button>
              </div>
            </div>

            <label class="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-orange-200 bg-orange-50/80 px-3.5 py-2.5 dark:border-orange-900/60 dark:bg-orange-950/30">
              <span class="flex items-center gap-2 text-xs font-bold text-orange-800 dark:text-orange-300">
                <Pin class="h-3.5 w-3.5" />
                <span>ปักหมุดเป็นข่าวสำคัญด้านบนสุด</span>
              </span>
              <input v-model="form.is_pinned" type="checkbox" class="peer sr-only" />
              <span class="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-[#EA7A0B] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#EA7A0B] after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:after:translate-x-5 dark:bg-slate-600" />
            </label>
          </div>
        </section>

        <!-- Repeatable Google-Form Block Cards -->
        <section
          v-for="(block, idx) in blocks"
          :key="block.id"
          :class="[
            adminCardClass,
            'space-y-3.5 border-l-4 p-5 transition',
            activeBlockId === block.id ? 'border-l-[#0284C7] shadow-md' : 'border-l-transparent hover:border-slate-300 dark:hover:border-[#3A3A3D]',
          ]"
          :aria-label="`บล็อกที่ ${idx + 1}: ${blockLabel(block.type)}`"
          @click="activeBlockId = block.id"
        >
          <!-- Block Card Header Bar -->
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-[#2C2C2E]">
            <div class="flex items-center gap-2">
              <span class="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-sky-50 text-[#0284C7] dark:bg-sky-950/60 dark:text-sky-300">
                <FileText v-if="block.type === 'text'" class="h-3.5 w-3.5" />
                <ImageIcon v-else-if="block.type === 'image_text'" class="h-3.5 w-3.5" />
                <Images v-else-if="block.type === 'gallery'" class="h-3.5 w-3.5" />
                <Paperclip v-else class="h-3.5 w-3.5" />
              </span>
              <span class="text-xs font-bold text-slate-700 dark:text-slate-200">
                ส่วนที่ {{ idx + 1 }} · {{ blockLabel(block.type) }}
              </span>
            </div>

            <div class="flex items-center gap-1">
              <button
                type="button"
                title="เลื่อนขึ้น"
                aria-label="เลื่อนขึ้น"
                :disabled="idx === 0"
                class="cursor-pointer rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 dark:hover:bg-[#252528] dark:hover:text-white"
                @click.stop="moveBlock(idx, -1)"
              >
                <ChevronUp class="h-4 w-4" />
              </button>
              <button
                type="button"
                title="เลื่อนลง"
                aria-label="เลื่อนลง"
                :disabled="idx === blocks.length - 1"
                class="cursor-pointer rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 dark:hover:bg-[#252528] dark:hover:text-white"
                @click.stop="moveBlock(idx, 1)"
              >
                <ChevronDown class="h-4 w-4" />
              </button>
              <button
                type="button"
                title="ทำสำเนาส่วนนี้"
                aria-label="ทำสำเนา"
                class="cursor-pointer rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-[#0284C7] dark:hover:bg-[#252528]"
                @click.stop="duplicateBlock(idx)"
              >
                <Copy class="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="ลบส่วนนี้"
                aria-label="ลบส่วนนี้"
                class="cursor-pointer rounded-lg p-1.5 text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                @click.stop="removeBlock(idx)"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <!-- BLOCK TYPE 1: TEXT -->
          <div v-if="block.type === 'text'" class="space-y-2.5">
            <input
              v-model="block.heading"
              type="text"
              placeholder="หัวข้อย่อย (ไม่บังคับ)"
              :class="fieldClass"
              class="font-semibold!"
            />
            <textarea
              v-model="block.body"
              rows="4"
              placeholder="รายละเอียดผลการตรวจ คำแนะนำ แผนการลงพื้นที่ หรือข้อมูลวิชาการ..."
              :class="fieldClass"
            />
          </div>

          <!-- BLOCK TYPE 2: IMAGE + TEXT (CUSTOM TOP / LEFT / RIGHT LAYOUT) -->
          <div v-else-if="block.type === 'image_text'" class="space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="text-[11px] font-bold text-slate-500 dark:text-[#98A2A8]">จัดวางตำแหน่งภาพ:</span>
              <div class="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-[#141416]">
                <button
                  v-for="choice in layoutChoices"
                  :key="choice.value"
                  type="button"
                  :aria-pressed="block.layout === choice.value"
                  class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition"
                  :class="block.layout === choice.value ? 'bg-white text-[#0284C7] shadow-2xs dark:bg-[#252528] dark:text-sky-300' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'"
                  @click.stop="block.layout = choice.value"
                >
                  <PanelTop v-if="choice.value === 'top'" class="h-3.5 w-3.5" />
                  <PanelLeft v-else-if="choice.value === 'left'" class="h-3.5 w-3.5" />
                  <PanelRight v-else class="h-3.5 w-3.5" />
                  <span>{{ choice.label }}</span>
                </button>
              </div>
            </div>

            <!-- Live Preview Arrangement -->
            <div
              :class="block.layout === 'top' ? 'space-y-3' : 'grid grid-cols-1 gap-4 md:grid-cols-12 md:items-start'"
            >
              <!-- Image Column -->
              <div
                :class="[
                  block.layout === 'top' ? 'w-full' : 'md:col-span-5',
                  block.layout === 'right' ? 'md:order-2' : '',
                ]"
                class="space-y-2"
              >
                <div
                  v-if="block.imageUrl"
                  class="group relative aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-[#2C2C2E] dark:bg-[#141416]"
                >
                  <img :src="block.imageUrl" alt="ภาพประกอบในบล็อก" class="h-full w-full object-cover" />
                  <div class="absolute right-2 top-2 flex gap-1.5">
                    <button
                      type="button"
                      class="cursor-pointer rounded-lg bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-900"
                      @click.stop="triggerBlockImageUpload(block.id)"
                    >
                      เปลี่ยนรูป
                    </button>
                    <button
                      type="button"
                      aria-label="ลบภาพในส่วนนี้"
                      class="cursor-pointer rounded-lg bg-rose-600/90 p-1.5 text-white hover:bg-rose-700"
                      @click.stop="block.imageUrl = ''"
                    >
                      <Trash2 class="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <button
                  v-else
                  type="button"
                  :disabled="uploadingBlockId === block.id"
                  class="flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 text-xs font-semibold text-[#0369A1] transition hover:border-[#0284C7] disabled:opacity-60 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-sky-400"
                  @click.stop="triggerBlockImageUpload(block.id)"
                >
                  <RefreshCw v-if="uploadingBlockId === block.id" class="h-5 w-5 animate-spin" />
                  <CloudUpload v-else class="h-5 w-5" />
                  <span>{{ uploadingBlockId === block.id ? 'กำลังอัปโหลด…' : 'อัปโหลดภาพประกอบ' }}</span>
                </button>
                <input
                  v-model="block.caption"
                  type="text"
                  placeholder="คำบรรยายใต้ภาพ (ไม่บังคับ)"
                  :class="fieldClass"
                  class="text-xs!"
                />
              </div>

              <!-- Text Column -->
              <div
                :class="[
                  block.layout === 'top' ? 'w-full space-y-2.5' : 'space-y-2.5 md:col-span-7',
                  block.layout === 'right' ? 'md:order-1' : '',
                ]"
              >
                <input
                  v-model="block.heading"
                  type="text"
                  placeholder="หัวข้อย่อย (ไม่บังคับ)"
                  :class="fieldClass"
                  class="font-semibold!"
                />
                <textarea
                  v-model="block.body"
                  :rows="block.layout === 'top' ? 3 : 5"
                  placeholder="คำอธิบายหรือเนื้อหาประกอบภาพ..."
                  :class="fieldClass"
                />
              </div>
            </div>
          </div>

          <!-- BLOCK TYPE 3: GALLERY -->
          <div v-else-if="block.type === 'gallery'" class="space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-1.5 text-xs">
                <span class="font-bold text-slate-500 dark:text-[#98A2A8]">จัดเรียงแถวละ:</span>
                <button
                  v-for="cols in ([1, 2, 3] as const)"
                  :key="cols"
                  type="button"
                  :aria-pressed="block.columns === cols"
                  class="cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-semibold transition"
                  :class="block.columns === cols ? 'border-[#0284C7] bg-sky-50 text-[#0284C7] dark:bg-sky-950/60 dark:text-sky-300' : 'border-slate-200 text-slate-600 dark:border-[#2C2C2E] dark:text-slate-300'"
                  @click.stop="block.columns = cols"
                >
                  {{ cols }} ภาพ
                </button>
              </div>
              <button
                type="button"
                :class="actionButtonClass"
                class="py-1.5! text-xs!"
                :disabled="uploadingBlockId === block.id"
                @click.stop="triggerBlockGalleryUpload(block.id)"
              >
                <RefreshCw v-if="uploadingBlockId === block.id" class="h-3.5 w-3.5 animate-spin" />
                <Plus v-else class="h-3.5 w-3.5" />
                <span>เพิ่มรูปในชุดนี้ ({{ block.images.length }})</span>
              </button>
            </div>

            <div
              class="grid gap-2.5"
              :class="block.columns === 1 ? 'grid-cols-1' : block.columns === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'"
            >
              <div
                v-for="(imgUrl, imgIdx) in block.images"
                :key="`${block.id}-${imgIdx}`"
                class="group relative aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-[#2C2C2E] dark:bg-[#141416]"
              >
                <img :src="imgUrl" :alt="`ภาพประกอบ ${imgIdx + 1}`" class="h-full w-full object-cover" />
                <button
                  type="button"
                  aria-label="ลบภาพนี้"
                  class="absolute right-1.5 top-1.5 cursor-pointer rounded-md bg-slate-900/85 p-1 text-white hover:bg-rose-600"
                  @click.stop="block.images.splice(imgIdx, 1)"
                >
                  <Trash2 class="h-3 w-3" />
                </button>
              </div>
              <button
                v-if="block.images.length === 0"
                type="button"
                class="col-span-full flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 py-8 text-xs font-semibold text-[#0369A1] hover:border-[#0284C7] dark:border-[#2C2C2E] dark:text-sky-400 cursor-pointer"
                @click.stop="triggerBlockGalleryUpload(block.id)"
              >
                <Images class="h-6 w-6" />
                <span>คลิกเพื่อเลือกหลายรูปพร้อมกัน (เพิ่มกี่ภาพก็ได้)</span>
              </button>
            </div>

            <input
              v-model="block.caption"
              type="text"
              placeholder="คำอธิบายชุดภาพ (ไม่บังคับ)"
              :class="fieldClass"
              class="text-xs!"
            />
          </div>

          <!-- BLOCK TYPE 4: FILE ATTACHMENT -->
          <div v-else class="space-y-3">
            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                :class="actionButtonClass"
                :disabled="uploadingBlockId === block.id"
                @click.stop="triggerBlockFileAttach(block.id)"
              >
                <RefreshCw v-if="uploadingBlockId === block.id" class="h-3.5 w-3.5 animate-spin text-[#0284C7]" />
                <Paperclip v-else class="h-3.5 w-3.5 text-[#0284C7]" />
                <span>{{ uploadingBlockId === block.id ? 'กำลังอัปโหลดไฟล์…' : 'เลือกไฟล์เอกสาร (PDF, Word, Excel, รูป)' }}</span>
              </button>
              <div class="flex min-w-52 flex-1 items-center gap-1.5">
                <input
                  v-model="fileLinkDraft[block.id]"
                  type="url"
                  placeholder="หรือวางลิงก์ไฟล์ เช่น https://..."
                  :class="fieldClass"
                  class="py-1.5! text-xs!"
                  @keydown.enter.prevent="addFileLink(block)"
                />
                <button
                  type="button"
                  :class="actionButtonClass"
                  class="shrink-0 py-1.5! text-xs!"
                  @click.stop="addFileLink(block)"
                >
                  เพิ่มลิงก์
                </button>
              </div>
            </div>

            <ul v-if="block.files.length > 0" class="space-y-1.5">
              <li
                v-for="(f, fIdx) in block.files"
                :key="`${block.id}-f-${fIdx}`"
                class="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs dark:border-[#2C2C2E] dark:bg-[#141416]"
              >
                <span class="flex min-w-0 items-center gap-2">
                  <FileText class="h-4 w-4 shrink-0 text-[#0284C7]" />
                  <span class="truncate font-semibold text-slate-800 dark:text-slate-100">{{ f.name }}</span>
                  <span class="shrink-0 font-mono text-[10px] text-slate-400">{{ formatBytes(f.size) }}</span>
                </span>
                <button
                  type="button"
                  aria-label="ลบไฟล์แนบ"
                  class="cursor-pointer rounded-lg p-1 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                  @click.stop="block.files.splice(fIdx, 1)"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </li>
            </ul>
            <p v-else class="text-[11px] text-slate-400">ยังไม่มีไฟล์แนบ (รองรับไฟล์ขนาดไม่เกิน 5 MB หรือวาง URL เอกสาร)</p>
          </div>
        </section>

        <!-- Errors & Bottom Submit Bar -->
        <p v-if="uploadError" role="alert" class="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{{ uploadError }}</p>
        <p v-if="validationError" role="alert" class="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{{ validationError }}</p>
        <p v-if="saveError" role="alert" class="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{{ saveError }}</p>

        <div :class="adminCardClass" class="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
          <button type="button" :class="actionButtonClass" @click="emit('cancel')">ยกเลิก</button>
          <button
            type="submit"
            class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-6 py-2.5 text-xs font-bold text-white transition hover:bg-[#15803D] disabled:opacity-50"
            :disabled="saving || isUploadingAny"
          >
            <RefreshCw v-if="saving" class="h-4 w-4 animate-spin" />
            <Send v-else class="h-4 w-4" />
            <span>บันทึกและเผยแพร่ข่าว</span>
          </button>
        </div>
      </div>

      <!-- Floating Right Google-Form-Style Block Toolbar (sm+) -->
      <aside
        aria-label="เพิ่มส่วนประกอบข่าว"
        class="sticky top-24 z-10 hidden shrink-0 flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-md sm:flex dark:border-[#2C2C2E] dark:bg-[#1E1E1E]"
      >
        <button
          type="button"
          title="เพิ่มบล็อกเนื้อหา"
          class="flex w-20 cursor-pointer flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[11px] font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-[#0284C7] dark:text-slate-200 dark:hover:bg-sky-950/50 dark:hover:text-sky-300"
          @click="addBlock('text')"
        >
          <Plus class="h-4 w-4" />
          <span>เนื้อหา</span>
        </button>
        <button
          type="button"
          title="เพิ่มบล็อกภาพ + เนื้อหา (เลือกซ้าย/ขวา/บนได้)"
          class="flex w-20 cursor-pointer flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[11px] font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-[#0284C7] dark:text-slate-200 dark:hover:bg-sky-950/50 dark:hover:text-sky-300"
          @click="addBlock('image_text')"
        >
          <ImageIcon class="h-4 w-4" />
          <span class="leading-tight text-center">ภาพ + เนื้อหา</span>
        </button>
        <button
          type="button"
          title="เพิ่มแกลเลอรีรูปภาพหลายภาพ"
          class="flex w-20 cursor-pointer flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[11px] font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-[#0284C7] dark:text-slate-200 dark:hover:bg-sky-950/50 dark:hover:text-sky-300"
          @click="addBlock('gallery')"
        >
          <Images class="h-4 w-4" />
          <span>แกลเลอรี</span>
        </button>
        <button
          type="button"
          title="เพิ่มบล็อกไฟล์แนบเอกสาร"
          class="flex w-20 cursor-pointer flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[11px] font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-[#0284C7] dark:text-slate-200 dark:hover:bg-sky-950/50 dark:hover:text-sky-300"
          @click="addBlock('file')"
        >
          <Paperclip class="h-4 w-4" />
          <span>ไฟล์แนบ</span>
        </button>
      </aside>
    </div>
  </form>
</template>
