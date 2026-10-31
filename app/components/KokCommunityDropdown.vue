<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { MapPin, ChevronDown, Check } from 'lucide-vue-next'
import { communityTargets, type CommunityTarget } from '../utils/kok-contract'

const props = defineProps<{
  modelValue: 'thaton' | 'ruammit' | 'pongkhong' | 'pakingtai' | string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: 'thaton' | 'ruammit' | 'pongkhong' | 'pakingtai'): void
}>()

const isOpen = ref(false)
const dropdownRef = ref<HTMLDivElement | null>(null)

// Focus on only the 4 target communities requested by the user
const focusCommunities = computed(() => communityTargets.slice(0, 4))

const currentTarget = computed<CommunityTarget>(() => {
  return (
    focusCommunities.value.find((item) => item.id === props.modelValue) ??
    focusCommunities.value[0]!
  )
})

function communityDisplayName(c: CommunityTarget): string {
  if (c.name.startsWith('บ้าน')) return c.name
  return `บ้าน${c.name}`
}

function selectCommunity(id: 'thaton' | 'ruammit' | 'pongkhong' | 'pakingtai') {
  emit('update:modelValue', id)
  isOpen.value = false
}

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('click', handleClickOutside)
  }
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', handleClickOutside)
  }
})
</script>

<template>
  <div ref="dropdownRef" class="relative inline-block text-left pointer-events-auto">
    <!-- Main Dropdown Trigger Button with 3 Rows Layout -->
    <button
      type="button"
      class="flex items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white/95 px-3 py-1.5 shadow-lg backdrop-blur-md transition-all hover:border-[#0284C7] dark:border-[#2C2C2E] dark:bg-[#1E1E1E]/95 dark:hover:border-[#00E5FF] focus:outline-hidden focus:ring-2 focus:ring-[#0284C7]/40 dark:focus:ring-[#00E5FF]/40 cursor-pointer"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      aria-label="เลือกพื้นที่ชุมชนเป้าหมาย"
      @click="toggleDropdown"
    >
      <!-- Icon with soft brand accent background -->
      <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0284C7]/15 text-[#0284C7] dark:bg-[#00E5FF]/20 dark:text-[#00E5FF]">
        <MapPin class="h-4 w-4" />
      </div>

      <!-- Current Community Details (3 Rows: Overline, Main Name, Subtitle) -->
      <div class="flex flex-col text-left leading-none">
        <!-- Row 1: ลักษณะเล็กๆ บอก 'เลือกพื้นที่' -->
        <span class="text-[9px] sm:text-[10px] font-medium text-slate-500 dark:text-zinc-400">
          เลือกพื้นที่
        </span>
        <!-- Row 2: ชื่อชุมชนหลัก เช่น 'บ้านท่าตอน' -->
        <span class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white my-0.5 tracking-tight">
          {{ communityDisplayName(currentTarget) }}
        </span>
        <!-- Row 3: ลักษณะเล็กๆ บอก ตำบล อำเภอ จังหวัด -->
        <span class="text-[9px] sm:text-[10px] text-slate-500 dark:text-zinc-400">
          {{ currentTarget.subdistrict }} {{ currentTarget.district }} {{ currentTarget.province }}
        </span>
      </div>

      <!-- Chevron Icon -->
      <ChevronDown
        class="h-4 w-4 text-slate-500 dark:text-zinc-400 transition-transform duration-200 ml-1 shrink-0"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <!-- Dropdown Menu List -->
    <transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="isOpen"
        class="absolute left-0 top-full mt-1.5 w-64 sm:w-72 rounded-2xl border border-slate-200/90 bg-white/98 p-1.5 shadow-2xl backdrop-blur-xl z-50 dark:border-[#2C2C2E] dark:bg-[#1C1C1E]/98"
        role="listbox"
        aria-label="รายชื่อ 4 ชุมชนเป้าหมาย"
      >
        <div class="px-2.5 py-1.5 border-b border-slate-100 dark:border-zinc-800 mb-1">
          <span class="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
            เลือกพื้นที่ดูสถานะ (4 ชุมชนเป้าหมาย)
          </span>
        </div>

        <button
          v-for="community in focusCommunities"
          :key="community.id"
          type="button"
          class="w-full flex items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer"
          :class="[
            modelValue === community.id
              ? 'bg-sky-50 dark:bg-sky-950/50 text-[#0284C7] dark:text-[#00E5FF] font-semibold'
              : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100/80 dark:hover:bg-zinc-800/80'
          ]"
          role="option"
          :aria-selected="modelValue === community.id"
          @click="selectCommunity(community.id)"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition"
              :class="[
                modelValue === community.id
                  ? 'bg-[#0284C7]/20 text-[#0284C7] dark:bg-[#00E5FF]/20 dark:text-[#00E5FF]'
                  : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'
              ]"
            >
              <MapPin class="h-3.5 w-3.5" />
            </span>
            <div class="flex flex-col min-w-0">
              <span class="text-xs truncate" :class="{ 'font-bold': modelValue === community.id }">
                {{ communityDisplayName(community) }}
              </span>
              <span class="text-[10px] text-slate-500 dark:text-zinc-400 truncate">
                {{ community.subdistrict }} {{ community.district }} {{ community.province }}
              </span>
            </div>
          </div>

          <!-- Active check icon -->
          <Check
            v-if="modelValue === community.id"
            class="h-4 w-4 shrink-0 text-[#0284C7] dark:text-[#00E5FF]"
          />
        </button>
      </div>
    </transition>
  </div>
</template>
