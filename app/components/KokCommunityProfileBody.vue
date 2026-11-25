<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, Briefcase, Download, FileText, Users, Waves } from 'lucide-vue-next'
import type { NewsContentBlock } from '../utils/news-types'

// เนื้อเรื่องราวชุมชน ใช้ร่วมกันระหว่างแท็บหมู่บ้านหน้าบ้าน (KokCommunityProfileCard) และตัวอย่างหน้าแอดมิน
export type StoryProfileView = {
  title?: string
  basin: string
  people: string
  livelihood: string
  risk: string
  cover_image_url?: string
  content_blocks?: NewsContentBlock[]
}

const props = defineProps<{ profile: StoryProfileView }>()

const contextItems = [
  { key: 'basin', term: 'ลุ่มน้ำ', icon: Waves, badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300' },
  { key: 'people', term: 'ผู้คน', icon: Users, badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' },
  { key: 'livelihood', term: 'อาชีพ', icon: Briefcase, badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300' },
  { key: 'risk', term: 'ความเสี่ยง', icon: AlertTriangle, badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' },
] as const

const storyBlocks = computed(() =>
  (props.profile.content_blocks ?? []).filter((block) => {
    if (block.type === 'text') return Boolean(block.heading?.trim() || block.body?.trim())
    if (block.type === 'image_text') return Boolean(block.imageUrl?.trim() || block.heading?.trim() || block.body?.trim())
    if (block.type === 'gallery') return block.images.length > 0
    if (block.type === 'file') return block.files.length > 0
    return false
  }),
)

function formatBytes(size?: number): string {
  if (!size) return 'ลิงก์เอกสาร'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <div class="space-y-5">
    <!-- 1. ข้อมูลบริบทหลักของหมู่บ้าน (ลุ่มน้ำ ผู้คน อาชีพ ความเสี่ยง) -->
    <dl class="space-y-2">
      <div
        v-for="item in contextItems"
        :key="item.key"
        class="rounded-2xl border border-slate-100 bg-slate-50/75 px-3.5 py-2.5 text-sm leading-relaxed dark:border-[#2C2C2E] dark:bg-[#141416]/85"
      >
        <div class="flex items-start gap-2.5">
          <dt
            class="mt-0.5 inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold"
            :class="item.badgeClass"
          >
            <component :is="item.icon" class="h-3 w-3 shrink-0" />
            <span>{{ item.term }}</span>
          </dt>
          <dd class="min-w-0 flex-1 text-slate-800 dark:text-slate-100">{{ profile[item.key] }}</dd>
        </div>
      </div>
    </dl>

    <!-- 2. เรื่องเล่าหมู่บ้านเรียงตามส่วน (Section Builder) -->
    <div v-if="storyBlocks.length" class="space-y-4 border-t border-slate-100 pt-4 dark:border-[#2C2C2E]">
      <section
        v-for="block in storyBlocks"
        :key="block.id"
        class="space-y-2.5"
      >
        <!-- Text Section -->
        <div
          v-if="block.type === 'text'"
          class="rounded-2xl border border-slate-100 bg-white/80 p-3.5 dark:border-[#2C2C2E] dark:bg-[#161618]"
        >
          <h3 v-if="block.heading?.trim()" class="text-sm font-bold text-slate-900 dark:text-white">
            {{ block.heading }}
          </h3>
          <p
            v-if="block.body?.trim()"
            class="text-sm leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300"
            :class="{ 'mt-1.5': Boolean(block.heading?.trim()) }"
          >
            {{ block.body }}
          </p>
        </div>

        <!-- Image + Text Section (top / left / right) -->
        <div
          v-else-if="block.type === 'image_text'"
          class="rounded-2xl border border-slate-100 bg-white/80 p-3.5 dark:border-[#2C2C2E] dark:bg-[#161618]"
        >
          <div :class="block.layout === 'top' || !block.imageUrl ? 'space-y-2.5' : 'grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-start'">
            <div
              v-if="block.imageUrl"
              :class="[
                block.layout === 'top' ? 'w-full' : 'sm:col-span-5',
                block.layout === 'right' ? 'sm:order-2' : '',
              ]"
            >
              <div class="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-[#2C2C2E] dark:bg-[#141416]">
                <img
                  :src="block.imageUrl"
                  :alt="block.caption || block.heading || 'ภาพประกอบเรื่องราวชุมชน'"
                  class="w-full object-cover"
                  :class="block.layout === 'top' ? 'aspect-video' : 'aspect-4/3'"
                />
              </div>
              <p v-if="block.caption?.trim()" class="mt-1 text-[11px] leading-snug text-slate-500 dark:text-[#98A2A8]">
                {{ block.caption }}
              </p>
            </div>

            <div
              :class="[
                block.layout === 'top' || !block.imageUrl ? 'w-full' : 'sm:col-span-7',
                block.layout === 'right' ? 'sm:order-1' : '',
              ]"
            >
              <h3 v-if="block.heading?.trim()" class="text-sm font-bold leading-snug text-slate-900 dark:text-white">
                {{ block.heading }}
              </h3>
              <p
                v-if="block.body?.trim()"
                class="text-sm leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300"
                :class="{ 'mt-1.5': Boolean(block.heading?.trim()) }"
              >
                {{ block.body }}
              </p>
            </div>
          </div>
        </div>

        <!-- Gallery Section (1 / 2 / 3 cols) -->
        <div
          v-else-if="block.type === 'gallery'"
          class="space-y-1.5 rounded-2xl border border-slate-100 bg-white/80 p-3.5 dark:border-[#2C2C2E] dark:bg-[#161618]"
        >
          <div
            class="grid gap-2"
            :class="block.columns === 1 ? 'grid-cols-1' : block.columns === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'"
          >
            <div
              v-for="(imgUrl, imgIdx) in block.images"
              :key="`${block.id}-${imgIdx}`"
              class="aspect-video overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-[#2C2C2E] dark:bg-[#141416]"
            >
              <img :src="imgUrl" :alt="`ภาพประกอบ ${imgIdx + 1}`" class="h-full w-full object-cover" />
            </div>
          </div>
          <p v-if="block.caption?.trim()" class="text-[11px] text-slate-500 dark:text-[#98A2A8]">
            {{ block.caption }}
          </p>
        </div>

        <!-- File Attachments Section -->
        <div
          v-else-if="block.type === 'file'"
          class="space-y-1.5 rounded-2xl border border-slate-100 bg-white/80 p-3.5 dark:border-[#2C2C2E] dark:bg-[#161618]"
        >
          <div class="text-xs font-bold text-slate-500 dark:text-[#98A2A8]">เอกสารแนบชุมชน</div>
          <ul class="space-y-1.5">
            <li v-for="(file, fIdx) in block.files" :key="`${block.id}-f-${fIdx}`">
              <a
                :href="file.url"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs transition hover:border-[#0284C7] hover:bg-sky-50/70 dark:border-[#2C2C2E] dark:bg-[#141416] dark:hover:border-sky-700"
              >
                <span class="flex min-w-0 items-center gap-2">
                  <FileText class="h-4 w-4 shrink-0 text-[#0284C7] dark:text-[#00E5FF]" />
                  <span class="truncate font-semibold text-slate-800 dark:text-slate-100">{{ file.name }}</span>
                  <span class="shrink-0 font-mono text-[10px] text-slate-400">{{ formatBytes(file.size) }}</span>
                </span>
                <Download class="h-3.5 w-3.5 shrink-0 text-slate-400" />
              </a>
            </li>
          </ul>
        </div>
      </section>
    </div>
  </div>
</template>
