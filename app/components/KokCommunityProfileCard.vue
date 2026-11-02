<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { communityTargets } from '../utils/kok-contract'
import { communityProfiles } from '../utils/community-profiles'

const props = defineProps<{ communityId: string }>()

const dismissed = ref(false)
watch(() => props.communityId, () => { dismissed.value = false })

const community = computed(() => communityTargets.find((target) => target.id === props.communityId))
const profile = computed(() => (community.value ? communityProfiles[community.value.id] : null))
const rows = computed(() => profile.value && [
  ['ลุ่มน้ำ', profile.value.basin],
  ['ผู้คน', profile.value.people],
  ['อาชีพ', profile.value.livelihood],
  ['ความเสี่ยง', profile.value.risk],
] as const)
</script>

<template>
  <aside
    v-if="community && profile && rows && !dismissed"
    aria-label="รู้จักชุมชน"
    class="fixed inset-x-2 bottom-[70px] z-20 max-h-[55svh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-[0_8px_28px_rgba(15,23,42,0.16)] sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-[76px] sm:w-[352px] dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-white"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <h2 class="text-base font-bold leading-snug">รู้จักชุมชน · {{ profile.title }}</h2>
        <p class="mt-0.5 text-xs text-slate-500 dark:text-[#98A2A8]">{{ community.subdistrict }} {{ community.district }} {{ community.province }}</p>
      </div>
      <button type="button" aria-label="ซ่อนการ์ดรู้จักชุมชน" class="-mr-1 -mt-1 shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-[#98A2A8] dark:hover:bg-[#252525] dark:hover:text-white" @click="dismissed = true">
        <X class="h-4 w-4" />
      </button>
    </div>

    <dl class="mt-2">
      <div v-for="[term, text] in rows" :key="term" class="flex items-start gap-2 border-t border-slate-100 py-2 text-[13px] leading-snug first:border-t-0 dark:border-[#2C2C2E]">
        <dt class="mt-0.5 shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600 dark:bg-[#2C2C2E] dark:text-[#C7D0D6]">{{ term }}</dt>
        <dd>{{ text }}</dd>
      </div>
    </dl>

    <p class="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
      ยังไม่มีขอบเขตหย่อมและผลสำรวจรายหย่อมของชุมชนนี้
    </p>
  </aside>
</template>
