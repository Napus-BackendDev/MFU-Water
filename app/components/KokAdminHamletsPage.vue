<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  ChevronDown,
  ChevronUp,
  CloudUpload,
  Copy,
  Eye,
  FileText,
  Image as ImageIcon,
  Images,
  PanelLeft,
  PanelRight,
  PanelTop,
  Paperclip,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-vue-next'
import { PROFILE_FIELDS } from '../../src/lib/map-data'
import type { AdminMapData } from '../composables/useAdminMapData'
import { useAdminNews } from '../composables/useAdminNews'
import { communityProfiles } from '../utils/community-profiles'
import { communityTargets } from '../utils/kok-contract'
import type { NewsContentBlock, NewsImageLayout } from '../utils/news-types'
import { actionButtonClass, adminCardClass, fieldClass, fieldLabelClass, primaryButtonClass } from '../utils/admin-ui'
import { chipClass, mutedClass, sectionTitleClass } from '../utils/map-data-ui'
import KokCommunityProfileBody from './KokCommunityProfileBody.vue'
import KokModalShell from './KokModalShell.vue'

const props = defineProps<{ ctx: AdminMapData }>()
const { client, run, busy, community } = props.ctx
const { uploadNewsPhoto, uploadNewsFile } = useAdminNews()

type ProfileState = {
  title: string
  basin: string
  people: string
  livelihood: string
  risk: string
  cover_image_url: string
  content_blocks?: NewsContentBlock[]
}

const overrides = ref<Record<string, ProfileState>>({})
const profile = reactive<Omit<ProfileState, 'content_blocks'>>({
  title: '',
  basin: '',
  people: '',
  livelihood: '',
  risk: '',
  cover_image_url: '',
})
const blocks = ref<NewsContentBlock[]>([])
const activeBlockId = ref<string | null>(null)
const previewProfileOpen = ref(false)

const profileLabels: Record<string, string> = {
  title: 'ชื่อที่แสดง',
  basin: 'ลุ่มน้ำ',
  people: 'ผู้คน',
  livelihood: 'อาชีพ',
  risk: 'ความเสี่ยง',
}

const layoutChoices: Array<{ value: NewsImageLayout; label: string }> = [
  { value: 'top', label: 'ภาพข้างบน' },
  { value: 'left', label: 'ภาพซ้าย' },
  { value: 'right', label: 'ภาพขวา' },
]

const coverInputRef = ref<HTMLInputElement | null>(null)
const blockImageInputRef = ref<HTMLInputElement | null>(null)
const blockGalleryInputRef = ref<HTMLInputElement | null>(null)
const blockFileInputRef = ref<HTMLInputElement | null>(null)

const pendingBlockId = ref<string | null>(null)
const uploadingCover = ref(false)
const uploadingBlockId = ref<string | null>(null)
const uploadError = ref<string | null>(null)
const fileLinkDraft = ref<Record<string, string>>({})

let uidSeq = 0
const nextId = (prefix = 'sec') => `${prefix}-${Date.now()}-${++uidSeq}`
const makeTextBlock = (heading = '', body = ''): NewsContentBlock => ({
  id: nextId('txt'),
  type: 'text',
  heading,
  body,
})

function cloneBlocks(list: NewsContentBlock[] = []): NewsContentBlock[] {
  return list.map((b) => ({
    ...b,
    ...(b.type === 'gallery' ? { images: [...b.images] } : {}),
    ...(b.type === 'file' ? { files: b.files.map((f) => ({ ...f })) } : {}),
  }))
}

const target = computed(() => communityTargets.find((item) => item.id === community.value)!)
const defaults = computed<ProfileState>(() => {
  const base = communityProfiles[community.value]
  return {
    title: base.title,
    basin: base.basin,
    people: base.people,
    livelihood: base.livelihood,
    risk: base.risk,
    cover_image_url: base.cover_image_url || '',
    content_blocks: base.content_blocks || [],
  }
})

const hasOverride = computed(() => Boolean(overrides.value[community.value]))

function currentBaseline(): ProfileState {
  const ov = overrides.value[community.value]
  const def = defaults.value
  if (!ov) return def
  return {
    title: ov.title,
    basin: ov.basin,
    people: ov.people,
    livelihood: ov.livelihood,
    risk: ov.risk,
    cover_image_url: ov.cover_image_url !== undefined ? ov.cover_image_url : def.cover_image_url,
    content_blocks: Array.isArray(ov.content_blocks) ? ov.content_blocks : def.content_blocks,
  }
}

function snapshotSignature(src: { title: string; basin: string; people: string; livelihood: string; risk: string; cover_image_url?: string; content_blocks?: NewsContentBlock[] }) {
  return JSON.stringify({
    title: src.title,
    basin: src.basin,
    people: src.people,
    livelihood: src.livelihood,
    risk: src.risk,
    cover_image_url: src.cover_image_url || '',
    content_blocks: src.content_blocks || [],
  })
}

const profileChanged = computed(() =>
  snapshotSignature({ ...profile, content_blocks: blocks.value }) !== snapshotSignature(currentBaseline()),
)

const isUploadingAny = computed(() => uploadingCover.value || uploadingBlockId.value !== null)

function fillProfile() {
  const src = currentBaseline()
  profile.title = src.title
  profile.basin = src.basin
  profile.people = src.people
  profile.livelihood = src.livelihood
  profile.risk = src.risk
  profile.cover_image_url = src.cover_image_url || ''
  blocks.value = cloneBlocks(src.content_blocks || [])
  activeBlockId.value = blocks.value[0]?.id ?? null
  uploadError.value = null
}

watch(community, fillProfile)

async function loadProfiles() {
  const result = await run('profiles', () => client.profiles.list())
  if (!result) return
  overrides.value = Object.fromEntries(
    result.items.map((item) => [
      item.community_id,
      {
        title: item.title,
        basin: item.basin,
        people: item.people,
        livelihood: item.livelihood,
        risk: item.risk,
        cover_image_url: item.cover_image_url ?? defaults.value.cover_image_url,
        content_blocks: Array.isArray(item.content_blocks) ? (item.content_blocks as NewsContentBlock[]) : undefined,
      },
    ]),
  )
  fillProfile()
}

onMounted(loadProfiles)

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
    profile.cover_image_url = await uploadNewsPhoto(file)
  } catch (err: any) {
    uploadError.value = err?.message || 'อัปโหลดภาพหน้าปกชุมชนไม่สำเร็จ ลองใหม่อีกครั้ง'
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
    uploadError.value = err?.message || 'อัปโหลดภาพบางภาพไม่สำเร็จ'
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

async function saveProfile() {
  if (
    await run(
      'profile-save',
      async () => {
        for (const field of PROFILE_FIELDS) {
          if (!profile[field as keyof typeof profile]?.trim()) {
            throw new Error(`กรุณากรอกข้อมูล “${profileLabels[field] || field}” ในการ์ดรู้จักชุมชนให้ครบถ้วน`)
          }
        }
        return client.profiles.save(community.value, {
          ...profile,
          content_blocks: cloneBlocks(blocks.value),
        })
      },
      `บันทึกการ์ดรู้จักชุมชน ${target.value.name} แล้ว หน้าบ้านเห็นเรื่องราวใหม่ทันที`,
    )
  ) {
    await loadProfiles()
  }
}

async function resetProfile() {
  if (await run('profile-reset', () => client.profiles.reset(community.value), `คืนข้อความเดิมของ ${target.value.name} แล้ว`)) {
    await loadProfiles()
  }
}

const previewProfile = computed(() => ({
  ...profile,
  content_blocks: cloneBlocks(blocks.value),
}))
</script>

<template>
  <form class="mx-auto max-w-4xl space-y-4" @submit.prevent="saveProfile">
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
        <!-- 1. การ์ดหัวเรื่อง & ข้อมูลบริบทหลัก “รู้จักชุมชน” -->
        <section
          :class="adminCardClass"
          class="space-y-4 border-t-4 border-t-[#0284C7] p-5 sm:p-6"
          aria-label="การ์ดรู้จักชุมชน"
        >
          <div class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-[#2C2C2E]">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h2 :class="sectionTitleClass">การ์ด “รู้จักชุมชน” · {{ target.name }}</h2>
                <span :class="chipClass(hasOverride ? 'sky' : 'neutral')">
                  {{ hasOverride ? 'แก้ไขจากค่าเริ่มต้นแล้ว' : 'ค่าเริ่มต้นจากชีต Village' }}
                </span>
              </div>
              <p :class="mutedClass" class="mt-0.5">
                ออกแบบเรื่องเล่าและข้อมูลพื้นฐานสำหรับแสดงฝั่งขวาของแท็บ “หมู่บ้าน” หน้าแผนที่สาธารณะ ({{ target.subdistrict }} {{ target.district }} {{ target.province }})
              </p>
            </div>
            <button type="button" :class="actionButtonClass" @click="previewProfileOpen = true">
              <Eye class="h-3.5 w-3.5" />
              <span>ตัวอย่างหน้าบ้าน</span>
            </button>
          </div>

          <!-- Large Cover Photo Upload -->
          <div>
            <div class="mb-1.5 flex items-center justify-between gap-2">
              <span class="text-xs font-bold text-slate-600 dark:text-slate-300">ภาพปกเรื่องราวหมู่บ้าน (Cover • 16:9)</span>
            </div>

            <div
              v-if="profile.cover_image_url"
              class="group relative aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-[#2C2C2E] dark:bg-[#141416]"
            >
              <img :src="profile.cover_image_url" :alt="`ภาพปก ${profile.title}`" class="h-full w-full object-cover" />
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
                  @click="profile.cover_image_url = ''"
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
                {{ uploadingCover ? 'กำลังอัปโหลดภาพปก…' : 'คลิกเพื่อเพิ่มภาพปกประจำหมู่บ้าน (16:9)' }}
              </span>
              <span class="text-[11px] text-slate-400">PNG, JPG หรือ WebP • ระบบจะบันทึกลง public/uploads และ MongoDB</span>
            </button>
          </div>

          <!-- Core 5 Context Fields -->
          <div class="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 md:grid-cols-2 dark:border-[#2C2C2E]">
            <div class="md:col-span-2">
              <label for="profile-title" :class="fieldLabelClass">ชื่อที่แสดง <span class="text-rose-600">*</span></label>
              <input id="profile-title" v-model="profile.title" type="text" maxlength="600" :class="fieldClass" class="font-bold!" required>
            </div>
            <div>
              <label for="profile-basin" :class="fieldLabelClass">ลุ่มน้ำ <span class="text-rose-600">*</span></label>
              <textarea id="profile-basin" v-model="profile.basin" rows="3" maxlength="600" :class="fieldClass" class="resize-none" required />
            </div>
            <div>
              <label for="profile-people" :class="fieldLabelClass">ผู้คน <span class="text-rose-600">*</span></label>
              <textarea id="profile-people" v-model="profile.people" rows="3" maxlength="600" :class="fieldClass" class="resize-none" required />
            </div>
            <div>
              <label for="profile-livelihood" :class="fieldLabelClass">อาชีพ <span class="text-rose-600">*</span></label>
              <textarea id="profile-livelihood" v-model="profile.livelihood" rows="3" maxlength="600" :class="fieldClass" class="resize-none" required />
            </div>
            <div>
              <label for="profile-risk" :class="fieldLabelClass">ความเสี่ยง <span class="text-rose-600">*</span></label>
              <textarea id="profile-risk" v-model="profile.risk" rows="3" maxlength="600" :class="fieldClass" class="resize-none" required />
            </div>
          </div>
        </section>

        <!-- Empty Storytelling Hint -->
        <div
          v-if="blocks.length === 0"
          :class="adminCardClass"
          class="border-dashed p-6 text-center text-xs text-slate-500 dark:text-[#98A2A8]"
        >
          ยังไม่มีส่วนเล่าเรื่องเพิ่มเติม — กดปุ่ม <strong class="text-[#0284C7]">+ เนื้อหา</strong>, <strong class="text-[#0284C7]">+ ภาพ + เนื้อหา</strong>, <strong class="text-[#0284C7]">+ แกลเลอรี</strong> หรือ <strong class="text-[#0284C7]">+ ไฟล์แนบ</strong> จากแถบด้านขวาเพื่อเล่าเรื่องของ {{ target.name }} ต่อได้เลย
        </div>

        <!-- 2. Section Cards Stack -->
        <section
          v-for="(block, idx) in blocks"
          :key="block.id"
          :class="[
            adminCardClass,
            activeBlockId === block.id
              ? 'border-l-4 border-l-[#0284C7] ring-1 ring-[#0284C7]/20'
              : 'border-l-4 border-l-transparent hover:border-l-slate-300 dark:hover:border-l-slate-600',
          ]"
          class="space-y-3 p-4 transition sm:p-5"
          :aria-label="`ส่วนที่ ${idx + 1} ${blockLabel(block.type)}`"
          @click="activeBlockId = block.id"
        >
          <!-- Block Card Header -->
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-[#2C2C2E]">
            <div class="flex items-center gap-2">
              <span class="rounded-lg bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-[#0369A1] dark:bg-sky-950/60 dark:text-sky-300">
                ส่วนที่ {{ idx + 1 }} • {{ blockLabel(block.type) }}
              </span>
            </div>

            <div class="flex items-center gap-1">
              <button
                type="button"
                title="ย้ายขึ้น"
                aria-label="ย้ายขึ้น"
                class="cursor-pointer rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 dark:hover:bg-[#252528]"
                :disabled="idx === 0"
                @click.stop="moveBlock(idx, -1)"
              >
                <ChevronUp class="h-4 w-4" />
              </button>
              <button
                type="button"
                title="ย้ายลง"
                aria-label="ย้ายลง"
                class="cursor-pointer rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 dark:hover:bg-[#252528]"
                :disabled="idx === blocks.length - 1"
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
              placeholder="หัวข้อย่อย (เช่น ประวัติชุมชน / วิถีชีวิตกับแม่น้ำ)"
              :class="fieldClass"
              class="font-semibold!"
            />
            <textarea
              v-model="block.body"
              rows="4"
              placeholder="เขียนเรื่องราว จุดเด่น ภูมิปัญญา หรือสถานการณ์ในพื้นที่..."
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

            <div :class="block.layout === 'top' ? 'space-y-3' : 'grid grid-cols-1 gap-4 md:grid-cols-12 md:items-start'">
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
                  <img :src="block.imageUrl" alt="ภาพประกอบเรื่องราวชุมชน" class="h-full w-full object-cover" />
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
                  placeholder="คำอธิบายหรือเรื่องราวประกอบภาพ..."
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
                class="col-span-full flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 py-8 text-xs font-semibold text-[#0369A1] hover:border-[#0284C7] dark:border-[#2C2C2E] dark:text-sky-400"
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

        <!-- Error Alert -->
        <p v-if="uploadError" role="alert" class="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{{ uploadError }}</p>

        <!-- Bottom Action Bar -->
        <div :class="adminCardClass" class="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
          <span :class="mutedClass">
            {{ profileChanged ? 'มีการแก้ไขเนื้อหา — กดบันทึกเพื่ออัปเดตหน้าบ้าน' : 'ข้อมูลล่าสุดตรงกับระบบแล้ว' }}
          </span>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" :class="actionButtonClass" :disabled="!hasOverride || busy !== null || isUploadingAny" @click="resetProfile">
              <RotateCcw class="h-3.5 w-3.5" />
              <span>คืนข้อความเดิม</span>
            </button>
            <button type="submit" :class="primaryButtonClass" :disabled="!profileChanged || busy !== null || isUploadingAny">
              <span>บันทึกข้อมูลชุมชน</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Floating Right Google-Form-Style Block Toolbar (sm+) -->
      <aside
        aria-label="เพิ่มส่วนประกอบเรื่องราวชุมชน"
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

    <!-- Modal: ตัวอย่างหน้าบ้านเห็นเรื่องราวชุมชน -->
    <KokModalShell v-if="previewProfileOpen" overlay-class="z-[1060] p-4" width-class="max-w-lg" @close="previewProfileOpen = false">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="text-base font-bold">หน้าบ้านเห็นการ์ด “รู้จักชุมชน” แบบนี้</h3>
          <p :class="mutedClass">ตัวอย่างการแสดงผลฝั่งขวาในแท็บหมู่บ้านของ {{ target.name }}</p>
        </div>
        <button type="button" aria-label="ปิดตัวอย่าง" class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#252525]" @click="previewProfileOpen = false">
          <X class="h-4 w-4" />
        </button>
      </div>
      <div class="max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/40 dark:border-[#2C2C2E] dark:bg-[#141416]">
        <div v-if="previewProfile.cover_image_url" class="h-40 w-full overflow-hidden bg-slate-900">
          <img :src="previewProfile.cover_image_url" :alt="previewProfile.title" class="h-full w-full object-cover" />
        </div>
        <div class="p-4">
          <h4 class="text-base font-bold leading-snug">รู้จักชุมชน · {{ previewProfile.title }}</h4>
          <p :class="mutedClass" class="mt-0.5 mb-3">{{ target.subdistrict }} {{ target.district }} {{ target.province }}</p>
          <KokCommunityProfileBody :profile="previewProfile" />
        </div>
      </div>
      <div class="flex justify-end">
        <button type="button" :class="actionButtonClass" @click="previewProfileOpen = false">ปิด</button>
      </div>
    </KokModalShell>
  </form>
</template>
