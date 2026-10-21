<script setup lang="ts">
import { ref, computed } from 'vue'
import { MapPinned, X } from 'lucide-vue-next'
import type { MyMapsReview } from '../utils/mymaps-review'

const props = defineProps<{data:MyMapsReview}>()
const selected = defineModel<string>({required:true})
const open = ref(false)
const layer = computed(() => props.data.layers.find((item) => item.id===selected.value))
</script>

<template>
  <div class="mymaps-control" @keydown.esc="open=false">
    <button type="button" class="source-button" :aria-expanded="open" aria-controls="mymaps-menu" @click="open=!open">
      <MapPinned :size="17" aria-hidden="true" />ข้อมูลชุมชน<span v-if="selected" class="active-dot" aria-hidden="true" />
    </button>
    <section v-if="open" id="mymaps-menu" class="source-panel" aria-label="ข้อมูลชุมชนจาก My Maps">
      <div class="flex items-center justify-between gap-2">
        <strong>ข้อมูลสำรวจชุมชน</strong>
        <button type="button" class="p-2" aria-label="ปิดข้อมูลชุมชน" @click="open=false"><X :size="18" /></button>
      </div>
      <label for="mymaps-layer" class="mt-2 block text-sm font-semibold">เลือกหัวข้อ</label>
      <select id="mymaps-layer" v-model="selected" class="source-select">
        <option value="">ไม่แสดงข้อมูลสำรวจ</option>
        <option v-for="item in data.layers" :key="item.id" :value="item.id">{{ item.label }}</option>
      </select>
      <template v-if="layer">
        <p class="my-3 text-sm">{{ layer.records.length }} แถวสำรวจ · {{ data.distinctCoordinates }} ตำแหน่ง<br>กดหมุดเพื่อดูข้อมูล</p>
        <div v-for="item in layer.legend" :key="item.label" class="legend-line">
          <span class="legend-swatch" :style="{background:item.color}" aria-hidden="true" />
          <span class="flex-1">{{ item.label }}</span><span class="tabular-nums">{{ item.rows }}</span>
        </div>
      </template>
      <p class="mt-3 text-xs">ข้อมูลสำรวจตามต้นฉบับ ไม่ใช่ข้อมูลสดหรือผลจำลอง · ดูเฉพาะในเครื่อง</p>
      <a :href="data.sourceUrl" target="_blank" rel="noreferrer" class="mt-2 inline-block text-xs underline underline-offset-2">เปิด My Maps ต้นทาง</a>
    </section>
  </div>
</template>

<style scoped>
.mymaps-control { position:absolute; left:12px; top:104px; z-index:1000; color:var(--wv-text,#0f172a); }
.source-button { display:flex; align-items:center; gap:7px; min-height:44px; padding:8px 12px; border:1px solid #cbd5e1; border-radius:10px; background:var(--wv-card,#fff); box-shadow:0 3px 12px #0002; font-size:12px; font-weight:600; }
.source-button:hover { border-color:#0284c7; }
.active-dot { width:7px; height:7px; border-radius:50%; background:#0284c7; }
.source-panel { margin-top:8px; padding:12px; width:min(330px,calc(100vw - 24px)); max-height:calc(100svh - 260px); overflow:auto; background:var(--wv-card,#fff); border:1px solid #cbd5e1; border-radius:12px; box-shadow:0 6px 24px #0003; }
.source-select { width:100%; margin-top:6px; min-height:44px; border:1px solid #94a3b8; border-radius:8px; padding:8px; background:var(--wv-card,#fff); color:inherit; font-size:13px; }
.legend-line { display:flex; gap:8px; align-items:center; margin:10px 0; font-size:12px; line-height:1.5; }
.legend-swatch { flex-shrink:0; width:12px; height:12px; border-radius:3px; }
button:focus-visible,select:focus-visible,a:focus-visible { outline:2px solid #0284c7; outline-offset:3px; }
@media(max-width:639px) { .mymaps-control { top:184px; } .source-panel { max-height:calc(100svh - 410px); } }
</style>
