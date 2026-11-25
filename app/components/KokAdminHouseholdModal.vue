<script setup lang="ts">
import { computed } from 'vue'
import { Check, Home, Trash2 } from 'lucide-vue-next'
import { LEVEL_DEFS, MEMBERS_FIELD, classifyHousehold } from '../../src/lib/map-data'
import { actionButtonClass, fieldClass, fieldLabelClass, primaryButtonClass } from '../utils/admin-ui'
import { chipClass, mutedClass } from '../utils/map-data-ui'
import KokModalShell from './KokModalShell.vue'

export interface HouseholdFormState {
  id: string | null
  name: string
  hamletId: string
  latitude: string
  longitude: string
  published: boolean
  answers: Record<string, string | number>
}

const props = defineProps<{
  form: HouseholdFormState
  busy: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save'): void
  (e: 'requestDelete'): void
}>()

const levels = LEVEL_DEFS['layer-1'] ?? []
const displayLevel = (key: string) => (key === '4' ? '3' : key === '5' ? '4' : key)
const previewLevel = computed(() => classifyHousehold(props.form.answers)['layer-1']!)
const previewInQueue = computed(() => previewLevel.value.key !== '5')

function setAnswer(key: string, value: string | number) {
  props.form.answers[key] = value
}

const memberCount = computed({
  get: () => Number(props.form.answers[MEMBERS_FIELD] ?? 0) || 0,
  set: (value: number) => {
    const clamped = Math.max(0, Math.min(30, Math.trunc(Number(value) || 0)))
    props.form.answers[MEMBERS_FIELD] = clamped
  },
})

function selectLevel(key: string) {
  if (key === '1') {
    setAnswer('ประวัติน้ำท่วมบ้าน', 'เคยท่วมบ้าน')
    memberCount.value = Math.max(1, memberCount.value)
  } else if (key === '2') {
    setAnswer('ประวัติน้ำท่วมบ้าน', 'ไม่เคยท่วมบ้าน')
    memberCount.value = Math.max(1, memberCount.value)
  } else if (key === '4') {
    setAnswer('ประวัติน้ำท่วมบ้าน', 'เคยท่วมบ้าน')
    memberCount.value = 0
  } else {
    setAnswer('ประวัติน้ำท่วมบ้าน', 'ไม่เคยท่วมบ้าน')
    memberCount.value = 0
  }
}

const optionPillClass = (selected: boolean, danger = false) => [
  'cursor-pointer rounded-xl border px-3 py-2 text-xs font-semibold transition text-left',
  selected
    ? danger
      ? 'border-rose-500 bg-rose-50 text-rose-800 dark:border-rose-400 dark:bg-rose-950/40 dark:text-rose-200'
      : 'border-[#0284C7] bg-sky-50 text-[#0369A1] dark:border-[#00E5FF] dark:bg-sky-950/40 dark:text-sky-200'
    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-slate-300 dark:hover:bg-[#252525]',
]
</script>

<template>
  <KokModalShell width-class="max-w-lg" overlay-class="z-[1060] p-4" @close="emit('close')">
    <div class="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-[#2C2C2E]">
      <div class="flex items-center gap-3 min-w-0">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
          :style="{ backgroundColor: previewLevel.color }"
        >
          <Home class="h-5 w-5" />
        </div>
        <div class="min-w-0">
          <h3 class="text-sm font-bold text-slate-900 dark:text-white">
            {{ form.id ? `แก้ไขครัวเรือน · ${form.id}` : 'เพิ่มครัวเรือนใหม่' }}
          </h3>
          <div class="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span class="font-semibold text-slate-700 dark:text-slate-200">
              ระดับ {{ displayLevel(previewLevel.key) }}
            </span>
            <span :class="chipClass(previewInQueue ? 'rose' : 'neutral')">
              {{ previewInQueue ? 'เข้าคิวอพยพ' : 'ปกติ · ไม่เข้าคิว' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <form class="space-y-4" @submit.prevent="emit('save')">
      <!-- 1. ชื่อครัวเรือน & พิกัด -->
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label for="hh-name" :class="fieldLabelClass">ชื่อครัวเรือน / ชื่อบ้าน</label>
          <input id="hh-name" v-model="form.name" type="text" placeholder="เช่น บ้านนายสมชาย, บ้านหัวมุมซอย 2..." :class="fieldClass">
        </div>
        <div>
          <label for="hh-lat" :class="fieldLabelClass">Latitude (ละติจูด) *</label>
          <input id="hh-lat" v-model="form.latitude" type="text" inputmode="decimal" placeholder="เช่น 20.058000" :class="fieldClass">
        </div>
        <div>
          <label for="hh-lng" :class="fieldLabelClass">Longitude (ลองจิจูด) *</label>
          <input id="hh-lng" v-model="form.longitude" type="text" inputmode="decimal" placeholder="เช่น 99.361000" :class="fieldClass">
        </div>
      </div>

      <!-- 2. ลำดับความอันตราย -->
      <div>
        <span :class="fieldLabelClass">ลำดับความอันตราย</span>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="lvl in levels"
            :key="lvl.key"
            type="button"
            :aria-pressed="previewLevel.key === lvl.key"
            class="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition"
            :class="previewLevel.key === lvl.key
              ? 'border-[#0284C7] bg-sky-50 text-[#0369A1] dark:border-[#00E5FF] dark:bg-sky-950/40 dark:text-sky-200'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-slate-300 dark:hover:bg-[#252525]'"
            @click="selectLevel(lvl.key)"
          >
            <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: lvl.color }" aria-hidden="true" />
            <span class="truncate">{{ displayLevel(lvl.key) }} · {{ lvl.label.replace(/^\d+\.\s*/, '').replace(/\s*\(.*\)$/, '') }}</span>
          </button>
        </div>
      </div>

      <!-- 3. จำนวนสมาชิกในบ้าน & 4. ประวัติ -->
      <div class="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-[#2C2C2E] dark:bg-[#141416]">
        <div>
          <label for="hh-members" :class="fieldLabelClass">จำนวนสมาชิกเปราะบางในบ้าน (คน)</label>
          <div class="flex items-center gap-2">
            <input id="hh-members" v-model.number="memberCount" type="number" min="0" max="30" :class="fieldClass" class="max-w-28 font-mono">
            <span :class="mutedClass">ผู้สูงอายุ เด็กเล็ก ผู้พิการ (0–30)</span>
          </div>
        </div>

        <div>
          <span :class="fieldLabelClass">ประวัติ · น้ำท่วมบ้าน</span>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              :class="optionPillClass(form.answers['ประวัติน้ำท่วมบ้าน'] === 'เคยท่วมบ้าน', true)"
              @click="setAnswer('ประวัติน้ำท่วมบ้าน', 'เคยท่วมบ้าน')"
            >
              เคยท่วมบ้าน
            </button>
            <button
              type="button"
              :class="optionPillClass(form.answers['ประวัติน้ำท่วมบ้าน'] === 'ไม่เคยท่วมบ้าน')"
              @click="setAnswer('ประวัติน้ำท่วมบ้าน', 'ไม่เคยท่วมบ้าน')"
            >
              ไม่เคยท่วมบ้าน
            </button>
          </div>
        </div>

        <div>
          <span :class="fieldLabelClass">ประวัติ · อุบัติเหตุรุนแรงจากน้ำ</span>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              :class="optionPillClass(form.answers['อุบัติเหตุรุนแรงจากน้ำ'] === 'เคยประสบเหตุรุนแรง', true)"
              @click="setAnswer('อุบัติเหตุรุนแรงจากน้ำ', 'เคยประสบเหตุรุนแรง')"
            >
              เคยประสบเหตุรุนแรง
            </button>
            <button
              type="button"
              :class="optionPillClass(form.answers['อุบัติเหตุรุนแรงจากน้ำ'] === 'ไม่มี')"
              @click="setAnswer('อุบัติเหตุรุนแรงจากน้ำ', 'ไม่มี')"
            >
              ไม่มี
            </button>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-[#2C2C2E]">
        <div>
          <button
            v-if="form.id"
            type="button"
            :disabled="busy"
            class="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
            @click="emit('requestDelete')"
          >
            <Trash2 class="h-3.5 w-3.5" />
            <span>ลบครัวเรือน</span>
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button type="button" :class="actionButtonClass" @click="emit('close')">ยกเลิก</button>
          <button type="submit" :disabled="busy" :class="primaryButtonClass">
            <Check class="h-3.5 w-3.5" />
            <span>{{ form.id ? 'บันทึกการแก้ไข' : 'บันทึกครัวเรือน' }}</span>
          </button>
        </div>
      </div>
    </form>
  </KokModalShell>
</template>
