<script setup lang="ts">
import { ref } from 'vue'
import { ClipboardList, ShieldCheck, X } from 'lucide-vue-next'
import { submitWaterSurvey, type SurveyWaypoint } from '../../src/lib/survey'
import { useGpsLocation } from '../composables/useGpsLocation'
import { useSurveyPhotos } from '../composables/useSurveyPhotos'
import KokArsenicLevelPicker from './KokArsenicLevelPicker.vue'
import KokLoadingScreen from './KokLoadingScreen.vue'
import KokLocationFields from './KokLocationFields.vue'
import KokPhotoPicker from './KokPhotoPicker.vue'

defineProps<{ open: boolean }>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submitted', payload: {
    waypoint: SurveyWaypoint
    waterSourceType: 'แม่น้ำ' | 'บ่อ' | 'ประปา'
    rainContext: 'ไม่ทราบ' | 'ไม่ตก' | 'ตก'
    sampleCollectedAt: string
    reviewStatus: 'auto_published' | 'pending_review'
    feedbackMessage?: string
  }): void
}>()

const fullName = ref('')
const phoneNumber = ref('')
const arsenicLevel = ref<number | null>(null)
const publicConsent = ref(false)
const formError = ref<string | null>(null)
const saving = ref(false)

const gps = useGpsLocation()
const photo = useSurveyPhotos()

const field = 'wv-input mt-1 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white'
const label = 'block text-xs font-semibold text-slate-700 dark:text-slate-200'

function closeModal() {
  if (!saving.value) emit('close')
}

async function captureLocation() {
  formError.value = null
  formError.value = await gps.capture()
}

async function selectPhoto(slot: 0 | 1, input: HTMLInputElement) {
  if (await photo.select(slot, input)) formError.value = null
}

function resetForm() {
  fullName.value = ''
  phoneNumber.value = ''
  arsenicLevel.value = null
  publicConsent.value = false
  formError.value = null
  gps.reset()
  photo.reset()
}

function validate() {
  if (!fullName.value.trim() || !phoneNumber.value.trim()) return 'กรุณากรอกชื่อ-นามสกุลและเบอร์โทรศัพท์สำหรับติดต่อกลับ'
  if (arsenicLevel.value === null) return 'กรุณาเลือกระดับสารหนู'
  if (!gps.coordinates.value) return 'กรุณาบันทึกพิกัด GPS ปัจจุบัน'
  if (!publicConsent.value) return 'กรุณายินยอมเผยแพร่พิกัด GPS และผลตรวจบนแผนที่สาธารณะ'
  if (photo.errors.value.some(Boolean)) return 'กรุณาเลือกไฟล์ภาพที่รองรับ'
  return null
}

async function handleSubmit() {
  if (saving.value) return
  formError.value = validate()
  if (formError.value) return

  saving.value = true
  try {
    const level = arsenicLevel.value!
    const recordedNow = new Date().toISOString()
    const waypoint = await submitWaterSurvey({
      fullName: fullName.value,
      phoneNumber: phoneNumber.value,
      arsenicLevelPpb: level,
      coordinates: gps.coordinates.value,
      gpsAccuracyMeters: gps.accuracy.value,
      photos: photo.photos.value,
      turnstileToken: '',
      publicConsent: publicConsent.value,
      sampleCollectedAt: recordedNow,
      waterSourceType: 'แม่น้ำ',
      rainContext: 'ไม่ทราบ',
    })

    const reviewStatus = level > 50 ? 'pending_review' : 'auto_published'
    const contributor = waypoint.contributor_label || 'ผู้ส่งผลตรวจ'
    emit('submitted', {
      waypoint,
      waterSourceType: 'แม่น้ำ',
      rainContext: 'ไม่ทราบ',
      sampleCollectedAt: recordedNow,
      reviewStatus,
      feedbackMessage: reviewStatus === 'pending_review'
        ? `บันทึกรหัส ${waypoint.sample_code} (${level} ppb > 50 ppb) ในนาม "${contributor}" เข้าคิวรอผู้ดูแลระบบตรวจสอบก่อนแสดงผลสาธารณะ (R10)`
        : `บันทึกผลสำรวจรหัส ${waypoint.sample_code} (${level} ppb) ในนาม "${contributor}" เผยแพร่บนแผนที่สาธารณะเรียบร้อยแล้ว`,
    })
    resetForm()
    emit('close')
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'บันทึกแบบสำรวจไม่สำเร็จ กรุณาลองใหม่'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" @mousedown.self="closeModal">
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="survey-title"
      class="wv-card max-h-[92vh] w-full max-w-2xl overflow-y-auto no-scrollbar rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 text-slate-900 shadow-2xl dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-white"
    >
      <KokLoadingScreen v-if="saving" variant="sending" />
      <form novalidate class="space-y-3.5" @submit.prevent="handleSubmit">
        <header class="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-[#2C2C2E] pb-3">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-200 dark:bg-[#00E5FF]/15 dark:text-[#00E5FF] dark:border-transparent">
              <ClipboardList class="h-5 w-5" />
            </div>
            <div>
              <h2 id="survey-title" class="text-base font-bold text-slate-900 dark:text-white sm:text-lg">ทำแบบสำรวจ</h2>
              <p class="text-xs text-slate-500 dark:text-[#98A2A8]">บันทึกผลตรวจชุดทดสอบสารหนูภาคสนาม 9 ระดับ</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="ปิดหน้าต่าง"
            class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-[#98A2A8] dark:hover:bg-[#252525] dark:hover:text-white transition"
            :disabled="saving"
            @click="closeModal"
          >
            <X class="h-5 w-5" />
          </button>
        </header>

        <div class="rounded-xl border border-sky-200 bg-sky-50/70 p-2.5 text-xs text-slate-800 dark:border-sky-900/40 dark:bg-[#00E5FF]/10 dark:text-sky-100">
          <div class="flex items-center gap-2 font-semibold text-sky-700 dark:text-[#00E5FF]">
            <ShieldCheck class="h-4 w-4 shrink-0" />
            <span>การรักษาข้อมูลส่วนบุคคล (ไม่เปิดเผยตัวตนต่อสาธารณะ)</span>
          </div>
          <p class="mt-1 text-slate-600 dark:text-[#D8F9FF]">
            ชื่อ-นามสกุล และเบอร์โทรศัพท์จะถูกเก็บรักษาเป็นความลับ สำหรับทีมงานติดต่อกลับเท่านั้น
            <strong>บนแผนที่จะแสดงเป็นชื่อสมมติอัตโนมัติ (เช่น ภูเขาอ่อนโยน-4bf3a7)</strong>
            และไฟล์ภาพถ่ายจะถูกจัดเก็บอย่างปลอดภัย โดยไม่เปิดเผยต่อสาธารณะ
          </p>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label :class="label">
            ชื่อ-นามสกุล / Full Name <span class="text-rose-600 dark:text-[#FF453A]">*จำเป็น</span>
            <input v-model="fullName" type="text" autocomplete="name" maxlength="200" :class="field" placeholder="ระบุชื่อ-นามสกุลผู้เก็บตัวอย่าง" :disabled="saving">
          </label>
          <label :class="label">
            เบอร์โทรศัพท์ / Phone Number <span class="text-rose-600 dark:text-[#FF453A]">*จำเป็น</span>
            <input v-model="phoneNumber" type="tel" autocomplete="tel" maxlength="40" :class="field" placeholder="08X-XXX-XXXX" :disabled="saving">
          </label>
        </div>

        <KokArsenicLevelPicker v-model="arsenicLevel" :disabled="saving" @update:model-value="formError = null" />

        <KokLocationFields
          v-model:lat="gps.latText.value"
          v-model:lon="gps.lonText.value"
          :accuracy="gps.accuracy.value"
          :state="gps.state.value"
          :disabled="saving"
          @capture="captureLocation"
          @edit="gps.accuracy.value = null"
        />

        <KokPhotoPicker
          :photos="photo.photos.value"
          :previews="photo.previews.value"
          :errors="photo.errors.value"
          :disabled="saving"
          @select="selectPhoto"
          @remove="photo.remove"
        />

        <label class="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-slate-300">
          <input v-model="publicConsent" type="checkbox" class="mt-0.5 h-4 w-4 accent-sky-600 dark:accent-[#00E5FF]" :disabled="saving" @change="formError = null">
          <span>ยินยอมให้แสดงพิกัดและผลตรวจสารหนูบนแผนที่สาธารณะ โดยชื่อ-นามสกุล เบอร์โทรศัพท์ และรูปถ่ายจะถูกเก็บรักษาเป็นความลับ ไม่แสดงบนแผนที่</span>
        </label>

        <p v-if="formError" role="alert" class="wv-alert-box text-xs font-medium">{{ formError }}</p>

        <footer class="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-[#2C2C2E] pt-3">
          <button type="button" class="wv-btn-secondary" :disabled="saving" @click="closeModal">ยกเลิก</button>
          <button type="submit" class="wv-btn-primary" :disabled="saving">{{ saving ? 'กำลังบันทึก…' : 'ส่งข้อมูลบันทึก' }}</button>
        </footer>
      </form>
    </section>
  </div>
</template>
