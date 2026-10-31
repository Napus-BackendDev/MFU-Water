<script setup lang="ts">
import { Clock } from 'lucide-vue-next'

export type ChemicalTimeRange = 'today' | '7d' | '30d' | 'none'

const props = withDefaults(
  defineProps<{
    pointCount?: number
    totalCount?: number
  }>(),
  {
    pointCount: undefined,
    totalCount: undefined,
  },
)

const model = defineModel<ChemicalTimeRange>({ default: 'today' })

const options: Array<{ id: Exclude<ChemicalTimeRange, 'none'>; label: string; shortLabel: string; hint: string }> = [
  { id: 'today', label: 'วันนี้', shortLabel: 'วันนี้', hint: 'ข้อมูลภายใน 24 ชม. ล่าสุด' },
  { id: '7d', label: '7 วันที่ผ่านมา', shortLabel: '7 วัน', hint: 'ข้อมูลย้อนหลัง 7 วัน' },
  { id: '30d', label: '1 เดือนที่ผ่านมา', shortLabel: '1 เดือน', hint: 'ข้อมูลย้อนหลัง 30 วัน' },
]

// Default is today; clicking the selected range again cancels the filter (no points until one is chosen).
function selectRange(id: Exclude<ChemicalTimeRange, 'none'>) {
  model.value = model.value === id ? 'none' : id
}
</script>

<template>
  <div
    class="kok-chemical-time-filter pointer-events-auto"
    role="region"
    aria-label="ตัวกรองเวลาสารเคมีปนเปื้อน"
  >
    <!-- Label Header for Desktop / Tablet -->
    <div class="order-1 flex flex-1 sm:flex-none items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 pl-1 pr-1 sm:border-r border-slate-200/80 dark:border-zinc-800">
      <Clock class="h-3.5 w-3.5 text-[#0284C7] dark:text-[#38BDF8]" />
      <span class="tracking-tight">ช่วงเวลาข้อมูลสารเคมี</span>
    </div>

    <!-- 3 Segmented Filter Buttons (full row under the label on phones) -->
    <div class="order-3 sm:order-2 basis-full sm:basis-auto grid grid-cols-3 sm:flex items-center gap-1 w-full sm:w-auto" role="group" aria-label="เลือกช่วงเวลาย้อนหลัง">
      <button
        v-for="opt in options"
        :key="opt.id"
        type="button"
        class="time-option-btn"
        :class="{
          'selected': model === opt.id,
          'idle': model !== opt.id,
        }"
        :aria-pressed="model === opt.id"
        :title="opt.hint"
        @click="selectRange(opt.id)"
      >
        <span class="hidden sm:inline">{{ opt.label }}</span>
        <span class="sm:hidden">{{ opt.shortLabel }}</span>
      </button>
    </div>

    <!-- Point count for the chosen range -->
    <div class="order-2 sm:order-3 flex items-center gap-1.5 pl-0.5 sm:pl-1 sm:border-l border-slate-200/80 dark:border-zinc-800 text-[11px] font-medium">
      <div
        v-if="pointCount !== undefined"
        class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-[#0284C7] dark:text-[#38BDF8] border border-sky-200/60 dark:border-sky-800/60 whitespace-nowrap"
        :title="`พบ ${pointCount} จุดสำรวจในช่วงที่เลือก`"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-[#0284C7] dark:bg-[#38BDF8]" />
        <span>{{ pointCount }} จุด</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kok-chemical-time-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 14px;
  background: var(--wv-card, rgba(255, 255, 255, 0.96));
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
  max-width: calc(100vw - 24px);
}

:global(html.dark) .kok-chemical-time-filter {
  background: rgba(28, 28, 30, 0.96);
  border-color: rgba(63, 63, 70, 0.6);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
}

.time-option-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.15s ease-in-out;
  cursor: pointer;
  border: 1px solid transparent;
}

.time-option-btn.idle {
  color: #475569;
  background: rgba(241, 245, 249, 0.85);
}

.time-option-btn.idle:hover {
  color: #0f172a;
  background: rgba(226, 232, 240, 1);
}

:global(html.dark) .time-option-btn.idle {
  color: #A1A1AA;
  background: rgba(39, 39, 42, 0.8);
}

:global(html.dark) .time-option-btn.idle:hover {
  color: #FAFAFA;
  background: rgba(63, 63, 70, 0.9);
}

.time-option-btn.selected {
  color: #ffffff;
  background: #0284C7;
  border-color: #0369A1;
  box-shadow: 0 2px 6px rgba(2, 132, 199, 0.35);
}

:global(html.dark) .time-option-btn.selected {
  color: #ffffff;
  background: #0284C7;
  border-color: #38BDF8;
  box-shadow: 0 2px 8px rgba(2, 132, 199, 0.45);
}

@media (max-width: 639px) {
  .kok-chemical-time-filter {
    padding: 4px 6px;
    gap: 4px;
    border-radius: 12px;
  }
  .time-option-btn {
    padding: 6px 8px;
    font-size: 11px;
    text-align: center;
  }
}
</style>
