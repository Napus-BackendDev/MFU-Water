<script setup lang="ts">
import { computed, ref } from 'vue'
import { X } from 'lucide-vue-next'
import { actionButtonClass, fieldClass, fieldLabelClass, primaryButtonClass } from '../utils/admin-ui'
import type { AdminSample, SampleEdit } from '../utils/admin-types'
import KokModalShell from './KokModalShell.vue'

const props = defineProps<{ sample: AdminSample; saving: boolean; error: string | null }>()
const emit = defineEmits<{ (e: 'save', values: SampleEdit): void; (e: 'close'): void }>()

const kitLevels = [0, 5, 10, 30, 50, 100, 200, 300, 500]
const waterSources = ['แม่น้ำ', 'บ่อ', 'ประปา']

// datetime-local works in the viewer's local time, without a zone.
function toLocalInput(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

const currentSource = props.sample.sample_nature?.water_source || 'แม่น้ำกก'
const form = ref({
  arsenicPpb: props.sample.arsenic_ppb,
  waterSource: currentSource,
  collectionTime: toLocalInput(props.sample.collection_time || props.sample.created_at || ''),
  latitude: props.sample.latitude as number | '',
  longitude: props.sample.longitude as number | '',
  contactName: props.sample.contact_name || '',
  contactPhone: props.sample.contact_phone || '',
})
const validation = ref<string | null>(null)

// Older samples can hold a value outside the current lists; keep it selectable so saving does not change it.
const levels = computed(() => kitLevels.includes(props.sample.arsenic_ppb) ? kitLevels : [...kitLevels, props.sample.arsenic_ppb].sort((a, b) => a - b))
const sources = computed(() => waterSources.includes(currentSource) ? waterSources : [currentSource, ...waterSources])

const statusNote = computed(() => {
  if (form.value.arsenicPpb > 50 && props.sample.publication_status === 'auto_published') return 'ค่าเกิน 50 ppb: รายการนี้จะกลับไปรอตรวจ และหายจากแผนที่สาธารณะจนกว่าจะอนุมัติ'
  if (form.value.arsenicPpb <= 50 && props.sample.publication_status === 'pending_review') return 'ค่าไม่เกิน 50 ppb: รายการนี้จะเผยแพร่บนแผนที่สาธารณะทันที'
  return null
})

function submit() {
  const { latitude, longitude, collectionTime } = form.value
  if (latitude === '' || longitude === '' || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    validation.value = 'กรุณากรอกละติจูดไม่เกิน ±90 และลองจิจูดไม่เกิน ±180'
    return
  }
  if (!collectionTime) {
    validation.value = 'กรุณาระบุเวลาเก็บตัวอย่าง'
    return
  }
  validation.value = null
  emit('save', { ...form.value, latitude, longitude, collectionTime: new Date(collectionTime).toISOString() })
}
</script>

<template>
  <KokModalShell @close="$emit('close')">
    <form class="space-y-4" novalidate @submit.prevent="submit">
      <header class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="text-[15px] font-bold">แก้ไขข้อมูลตัวอย่างน้ำ</h3>
          <p class="mt-0.5 font-mono text-xs text-slate-500 dark:text-[#98A2A8]">{{ sample.sample_code }}</p>
        </div>
        <button type="button" aria-label="ปิด" class="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-[#252525] dark:hover:text-white" @click="$emit('close')"><X class="h-4 w-4" /></button>
      </header>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label for="sample-ppb" :class="fieldLabelClass">ระดับสารหนู (ppb)</label>
          <select id="sample-ppb" v-model.number="form.arsenicPpb" :class="fieldClass" class="cursor-pointer">
            <option v-for="level in levels" :key="level" :value="level">{{ level }} ppb</option>
          </select>
        </div>
        <div>
          <label for="sample-source" :class="fieldLabelClass">แหล่งน้ำ</label>
          <select id="sample-source" v-model="form.waterSource" :class="fieldClass" class="cursor-pointer">
            <option v-for="source in sources" :key="source" :value="source">{{ source }}</option>
          </select>
        </div>
        <div class="sm:col-span-2">
          <label for="sample-time" :class="fieldLabelClass">เวลาเก็บตัวอย่าง</label>
          <input id="sample-time" v-model="form.collectionTime" type="datetime-local" :class="fieldClass">
        </div>
        <div>
          <label for="sample-lat" :class="fieldLabelClass">ละติจูด</label>
          <input id="sample-lat" v-model.number="form.latitude" type="number" step="any" min="-90" max="90" :class="fieldClass" class="font-mono">
        </div>
        <div>
          <label for="sample-lng" :class="fieldLabelClass">ลองจิจูด</label>
          <input id="sample-lng" v-model.number="form.longitude" type="number" step="any" min="-180" max="180" :class="fieldClass" class="font-mono">
        </div>
        <div>
          <label for="sample-name" :class="fieldLabelClass">ชื่อผู้รายงาน (เฉพาะแอดมิน)</label>
          <input id="sample-name" v-model="form.contactName" type="text" maxlength="200" autocomplete="off" :class="fieldClass">
        </div>
        <div>
          <label for="sample-phone" :class="fieldLabelClass">เบอร์โทร (เฉพาะแอดมิน)</label>
          <input id="sample-phone" v-model="form.contactPhone" type="tel" maxlength="40" autocomplete="off" :class="fieldClass">
        </div>
      </div>

      <p v-if="statusNote" class="rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">{{ statusNote }}</p>
      <p v-if="validation || error" role="alert" class="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{{ validation || error }}</p>

      <footer class="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-[#2C2C2E]">
        <button type="button" :class="actionButtonClass" @click="$emit('close')">ยกเลิก</button>
        <button type="submit" :class="primaryButtonClass" :disabled="saving">{{ saving ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข' }}</button>
      </footer>
    </form>
  </KokModalShell>
</template>
