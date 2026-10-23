<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Layers, X } from 'lucide-vue-next'
import { floodStages, floodDepthLevels, loadFloodScenario, type FloodScenario } from '../utils/flood-simulation'
import { observationDates, observationWaterColor, loadFloodObservations, type FloodObservation, type ObservationDate } from '../utils/flood-observations'

const stage = defineModel<number>('stage', { required: true })
const simulationVisible = defineModel<boolean>('simulationVisible', { required: true })
const observationsVisible = defineModel<boolean>('observationsVisible', { required: true })
const date = defineModel<ObservationDate>('date', { required: true })
const observations = ref<FloodObservation | null>(null)
const observationFailed = ref(false)
const selectedObservation = computed(() => observations.value?.dates.find((item) => item.date === date.value))
watch(observationsVisible, (value) => {
  if (!value || observations.value) return
  observationFailed.value = false
  void loadFloodObservations().then((data) => { observations.value = data }).catch(() => { observationFailed.value = true })
}, { immediate: true })
const open = ref(false)
const failed = ref(false)
const scenario = ref<FloodScenario | null>(null)
watch(stage, (rise) => {
  scenario.value = null
  failed.value = false
  void loadFloodScenario(rise).then((result) => { if (stage.value === rise) scenario.value = result })
    .catch(() => { if (stage.value === rise) failed.value = true })
}, { immediate: true })
</script>

<template>
  <div class="relative" @keydown.esc="open = false">
    <button type="button" class="round-control" aria-label="เลเยอร์น้ำท่วม" :aria-expanded="open" aria-controls="flood-layer-menu" @click="open = !open">
      <Layers class="h-4 w-4 text-sky-700" />
    </button>
    <section v-if="open" id="flood-layer-menu" class="flood-layer-menu" aria-label="ตั้งค่าเลเยอร์น้ำท่วม">
      <div class="flex items-center justify-between gap-3">
        <strong>เลเยอร์น้ำท่วม</strong>
        <button type="button" aria-label="ปิดเลเยอร์น้ำท่วม" class="p-2" @click="open = false"><X :size="17" /></button>
      </div>
      <label class="layer-toggle"><input v-model="simulationVisible" type="checkbox">น้ำจำลอง</label>
      <div v-if="simulationVisible" class="layer-settings">
        <label for="simulation-stage" class="text-sm">ระดับแม่น้ำเพิ่ม</label>
        <select id="simulation-stage" v-model="stage" class="observation-select">
          <option v-for="option in floodStages" :key="option.id" :value="option.riseMetres">Level {{ option.id }} · +{{ option.riseMetres }} เมตร</option>
        </select>
        <p class="text-sm font-semibold">ความลึกน้ำประมาณการ</p>
        <div v-for="option in floodDepthLevels" :key="option.id" class="level-row">
          <span class="observation-swatch" :style="{background:option.color}" aria-hidden="true" />
          <span class="flex-1 text-sm">{{ option.label }}</span>
          <span class="text-xs tabular-nums">{{ option.depth }}</span>
        </div>
        <p v-if="failed" role="alert" class="mt-2 text-xs text-red-700">โหลดแบบจำลองไม่สำเร็จ ลองเปิดหน้าใหม่</p>
        <p v-else-if="!scenario" role="status" class="mt-2 text-xs">กำลังโหลดแบบจำลอง…</p>
        <p v-else-if="!scenario.features.length" role="status" class="mt-2 text-xs">ไม่พบพื้นที่บกท่วมในสถานการณ์นี้ตามข้อมูลทดลอง</p>
      </div>
      <label class="layer-toggle"><input v-model="observationsVisible" type="checkbox">ข้อมูลน้ำท่วมจริง</label>
      <div v-if="observationsVisible" class="layer-settings">
        <label for="observation-date" class="text-sm font-semibold">ภาพดาวเทียม Sentinel-2</label>
        <select id="observation-date" v-model="date" class="observation-select">
          <option v-for="item in observationDates" :key="item.date" :value="item.date">{{ item.label }}</option>
        </select>
        <p v-if="observationFailed" role="alert" class="text-sm">โหลดข้อมูลไม่สำเร็จ ลองสลับหัวข้ออีกครั้ง</p>
        <p v-else-if="!selectedObservation" role="status" class="text-sm">กำลังโหลดข้อมูล…</p>
        <template v-else>
          <p role="status" class="text-sm">{{ selectedObservation.usableFraction === 0 ? 'เมฆบังทั้งหมด — ประเมินพื้นที่น้ำวันนี้ไม่ได้' : `ประเมินภาพได้ ${(selectedObservation.usableFraction * 100).toFixed(1)}% ของพื้นที่` }}</p>
          <div class="level-row"><span class="observation-swatch" :style="{background:observationWaterColor}" /><span class="text-sm">พื้นที่น้ำที่ตรวจพบ รวมแม่น้ำเดิม</span></div>
          <div class="level-row"><span class="observation-swatch" style="background:#64748b" /><span class="text-sm">เมฆ / ประเมินไม่ได้</span></div>
          <p class="text-xs">ข้อมูลภาพจริงผ่านการจำแนกพื้นที่น้ำ ไม่ใช่ค่าความลึกหรือข้อมูลสด</p>
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
.flood-layer-menu { position: fixed; right: 12px; top: 64px; width: min(310px, calc(100vw - 24px)); max-height: min(560px, calc(100svh - 180px)); overflow-y: auto; border-radius: 14px; padding: 12px; background: var(--wv-card, white); color: var(--wv-text, #0f172a); box-shadow: 0 6px 24px #0003; }
.layer-toggle { display: flex; gap: 10px; align-items: center; min-height: 44px; margin-top: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.layer-toggle input { width: 18px; height: 18px; accent-color: #0369a1; }
.layer-settings { margin: 0 0 16px 28px; }
.observation-select { display: block; width: 100%; margin: 8px 0 12px; padding: 10px; border: 1px solid #94a3b8; border-radius: 8px; background: var(--wv-card,white); color: inherit; }
.observation-swatch { display: inline-block; width: 12px; height: 12px; border-radius: 2px; flex-shrink: 0; }
.layer-toggle input:focus-visible, .observation-select:focus-visible { outline: 2px solid #0369a1; outline-offset: 3px; }
.level-row { display: flex; gap: 8px; align-items: center; padding: 8px 0; }
:global(html.dark) .flood-layer-menu p { color: #cbd5e1; }
@media (max-width: 767px) { .flood-layer-menu { top: 64px; } }
</style>
