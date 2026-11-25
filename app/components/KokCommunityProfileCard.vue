<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BookOpenText, MapPin, X } from 'lucide-vue-next'
import { communityTargets } from '../utils/kok-contract'
import { communityProfiles } from '../utils/community-profiles'
import { publicMapData } from '../utils/map-data-public'
import KokCommunityProfileBody from './KokCommunityProfileBody.vue'

const props = defineProps<{ communityId: string }>()

const dismissed = ref(false)
watch(() => props.communityId, () => { dismissed.value = false })

const community = computed(() => communityTargets.find((target) => target.id === props.communityId))
const profile = computed(() => {
  if (!community.value) return null
  const fallback = communityProfiles[community.value.id]
  const override = publicMapData.profiles[community.value.id]
  if (!override) return fallback
  return {
    ...fallback,
    ...override,
    cover_image_url: override.cover_image_url !== undefined ? override.cover_image_url : fallback.cover_image_url,
    content_blocks: override.content_blocks !== undefined ? override.content_blocks : fallback.content_blocks,
  }
})
</script>

<template>
  <template v-if="community && profile">
    <!-- Full-height Right Storytelling Panel -->
    <aside
      v-if="!dismissed"
      aria-label="รู้จักชุมชน"
      class="fixed inset-x-2 bottom-[70px] top-[76px] z-20 flex flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 text-slate-900 shadow-[0_14px_44px_rgba(15,23,42,0.22)] backdrop-blur-md sm:inset-x-auto sm:bottom-[74px] sm:right-3 sm:top-[74px] sm:w-[416px] lg:w-[450px] 2xl:bottom-[18px] dark:border-[#2C2C2E] dark:bg-[#1E1E1E]/95 dark:text-white"
    >
      <!-- Hero Cover Photo (if set) -->
      <div v-if="profile.cover_image_url" class="relative h-40 w-full shrink-0 overflow-hidden bg-slate-900 sm:h-44">
        <img
          :src="profile.cover_image_url"
          :alt="`ภาพปก ${profile.title}`"
          class="h-full w-full object-cover"
        />
        <div class="pointer-events-none absolute inset-0 bg-linear-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
        <span class="absolute bottom-3 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-bold text-slate-900 backdrop-blur-xs">
          <BookOpenText class="h-3 w-3 text-[#0284C7]" />
          <span>เรื่องราวชุมชน</span>
        </span>
        <button
          type="button"
          aria-label="ซ่อนการ์ดรู้จักชุมชน"
          class="absolute right-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-slate-950/65 text-white backdrop-blur-xs transition hover:bg-slate-950/90"
          @click="dismissed = true"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- Sticky Panel Header -->
      <div class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-[#2C2C2E]">
        <div class="min-w-0">
          <div v-if="!profile.cover_image_url" class="mb-1 inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-[#0284C7] dark:bg-sky-950/60 dark:text-sky-300">
            <BookOpenText class="h-3 w-3" />
            <span>เรื่องราวชุมชน</span>
          </div>
          <h2 class="text-lg font-extrabold leading-snug text-slate-900 dark:text-white">
            รู้จักชุมชน · {{ profile.title }}
          </h2>
          <p class="mt-0.5 flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-[#98A2A8]">
            <MapPin class="h-3.5 w-3.5 shrink-0 text-rose-500" />
            <span class="truncate">{{ community.subdistrict }} {{ community.district }} {{ community.province }}</span>
          </p>
        </div>
        <button
          v-if="!profile.cover_image_url"
          type="button"
          aria-label="ซ่อนการ์ดรู้จักชุมชน"
          class="-mr-1.5 -mt-1 shrink-0 cursor-pointer rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-[#98A2A8] dark:hover:bg-[#252525] dark:hover:text-white"
          @click="dismissed = true"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- Scrollable Storytelling Content -->
      <div class="flex-1 overflow-y-auto px-5 py-4">
        <KokCommunityProfileBody :profile="profile" />
      </div>
    </aside>

    <!-- Floating Reopen Pill when dismissed -->
    <button
      v-else
      type="button"
      aria-label="เปิดเรื่องราวชุมชน"
      class="fixed bottom-[76px] right-3 z-20 inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-4 py-2.5 text-xs font-bold text-slate-800 shadow-lg backdrop-blur-md transition hover:border-[#0284C7] hover:text-[#0284C7] sm:bottom-5 dark:border-[#2C2C2E] dark:bg-[#1E1E1E]/95 dark:text-slate-100"
      @click="dismissed = false"
    >
      <BookOpenText class="h-4 w-4 text-[#0284C7] dark:text-[#00E5FF]" />
      <span>รู้จักชุมชน · {{ profile.title }}</span>
    </button>
  </template>
</template>
