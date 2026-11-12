<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { communityTargets } from '../utils/kok-contract'
import { communityProfiles } from '../utils/community-profiles'
import { publicMapData } from '../utils/map-data-public'
import KokCommunityProfileBody from './KokCommunityProfileBody.vue'

const props = defineProps<{ communityId: string }>()

const dismissed = ref(false)
watch(() => props.communityId, () => { dismissed.value = false })

const community = computed(() => communityTargets.find((target) => target.id === props.communityId))
const profile = computed(() => (community.value ? publicMapData.profiles[community.value.id] ?? communityProfiles[community.value.id] : null))
const hamletsWithPlace = computed(() => publicMapData.hamlets.filter((hamlet) => hamlet.center).length)
const hamletNotice = computed(() => {
  const registered = publicMapData.hamlets.length
  if (!registered) return 'ยังไม่มีทะเบียนหมู่บ้านของชุมชนนี้'
  if (!hamletsWithPlace.value) return `มีหมู่บ้านในทะเบียน ${registered} แห่ง แต่ยังไม่ได้ปักตำแหน่งบนแผนที่`
  if (hamletsWithPlace.value < registered) return `ปักตำแหน่งแล้ว ${hamletsWithPlace.value} จาก ${registered} หมู่บ้าน`
  return `ปักตำแหน่งครบ ${registered} หมู่บ้าน`
})
</script>

<template>
  <aside
    v-if="community && profile && !dismissed"
    aria-label="รู้จักชุมชน"
    class="fixed inset-x-2 bottom-[70px] z-20 max-h-[55svh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-[0_8px_28px_rgba(15,23,42,0.16)] sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-[76px] sm:w-[352px] dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-white"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <h2 class="text-lg font-bold leading-snug">รู้จักชุมชน · {{ profile.title }}</h2>
        <p class="mt-0.5 text-sm text-slate-600 dark:text-[#98A2A8]">{{ community.subdistrict }} {{ community.district }} {{ community.province }}</p>
      </div>
      <button type="button" aria-label="ซ่อนการ์ดรู้จักชุมชน" class="-mr-2 -mt-2 shrink-0 cursor-pointer rounded-lg p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-[#98A2A8] dark:hover:bg-[#252525] dark:hover:text-white" @click="dismissed = true">
        <X class="h-4.5 w-4.5" />
      </button>
    </div>

    <KokCommunityProfileBody :profile="profile" />

    <p class="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
      {{ hamletNotice }}
    </p>
  </aside>
</template>
