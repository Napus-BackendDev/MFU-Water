<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Camera, CheckCircle2, ClipboardList, Crosshair, MapPin, ShieldCheck, X } from 'lucide-vue-next'
import {
  submitWaterSurvey,
  validateSurveyPhoto,
  type SurveyCoordinates,
  type SurveyPhoto,
  type SurveyWaypoint,
} from '../../src/lib/survey'
import { contractData } from '../utils/kok-contract'
import KokLoadingScreen from './KokLoadingScreen.vue'

const props = defineProps<{
  open: boolean
}>()

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
const latText = ref('')
const lonText = ref('')
const gpsAccuracyMeters = ref<number | null>(null)
const locationState = ref<'idle' | 'loading' | 'error'>('idle')
const photos = ref<[SurveyPhoto, SurveyPhoto]>([null, null])
const photoErrors = ref<[string | null, string | null]>([null, null])
const photoPreviews = ref<[string | null, string | null]>([null, null])
const submittedPhotos = ref<Array<{ url: string; name: string }>>([])
const publicConsent = ref(false)
const formError = ref<string | null>(null)
const saving = ref(false)
const savedMessage = ref<string | null>(null)
const statusBoxRef = ref<HTMLElement | null>(null)

const levels = contractData.levels

const parsedCoordinates = computed<SurveyCoordinates | null>(() => {
  const latStr = String(latText.value ?? '').trim()
  const lonStr = String(lonText.value ?? '').trim()
  if (latStr === '' || lonStr === '') return null
  const latitude = Number(latStr)
  const longitude = Number(lonStr)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return { latitude, longitude }
})

const selectedLevelMeta = computed(() =>
  levels.find((item) => item.ppb === arsenicLevel.value) ?? null,
)

function closeModal() {
  if (!saving.value) emit('close')
}

function captureLocation() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    locationState.value = 'error'
    formError.value = 'เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง'
    return
  }
  formError.value = null
  locationState.value = 'loading'
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      latText.value = String(coords.latitude)
      lonText.value = String(coords.longitude)
      gpsAccuracyMeters.value = Number.isFinite(coords.accuracy) ? Math.round(coords.accuracy) : null
      locationState.value = 'idle'
    },
    ({ code }) => {
      locationState.value = 'error'
      const messages: Record<number, string> = {
        1: 'อนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์ก่อนบันทึกพิกัด',
        2: 'ไม่พบตำแหน่งปัจจุบัน กรุณาลองอีกครั้ง',
        3: 'ค้นหาตำแหน่งนานเกินไป กรุณาลองอีกครั้ง',
      }
      formError.value = messages[code] ?? 'อ่านตำแหน่งไม่สำเร็จ กรุณาลองอีกครั้ง'
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
  )
}

async function onSelectPhoto(index: 0 | 1, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  if (!file) return
  const nextPhotos: [SurveyPhoto, SurveyPhoto] = [...photos.value] as [SurveyPhoto, SurveyPhoto]
  const nextErrors: [string | null, string | null] = [...photoErrors.value] as [string | null, string | null]
  nextPhotos[index] = file
  nextErrors[index] = null
  photos.value = nextPhotos
  photoErrors.value = nextErrors

  const err = await validateSurveyPhoto(file)
  if (err) {
    nextPhotos[index] = null
    nextErrors[index] = err
    photos.value = [...nextPhotos] as [SurveyPhoto, SurveyPhoto]
    photoErrors.value = [...nextErrors] as [string | null, string | null]
    if (photoPreviews.value[index]) {
      if (typeof window !== 'undefined' && window.URL?.revokeObjectURL) {
        URL.revokeObjectURL(photoPreviews.value[index]!)
      }
      photoPreviews.value[index] = null
    }
    input.value = ''
    return
  }

  if (photoPreviews.value[index]) {
    if (typeof window !== 'undefined' && window.URL?.revokeObjectURL) {
      URL.revokeObjectURL(photoPreviews.value[index]!)
    }
  }
  if (typeof window !== 'undefined' && window.URL?.createObjectURL) {
    photoPreviews.value[index] = URL.createObjectURL(file)
  }
  formError.value = null
}

function removePhoto(index: 0 | 1) {
  const nextPhotos: [SurveyPhoto, SurveyPhoto] = [...photos.value] as [SurveyPhoto, SurveyPhoto]
  const nextErrors: [string | null, string | null] = [...photoErrors.value] as [string | null, string | null]
  nextPhotos[index] = null
  nextErrors[index] = null
  photos.value = nextPhotos
  photoErrors.value = nextErrors
  if (photoPreviews.value[index]) {
    if (typeof window !== 'undefined' && window.URL?.revokeObjectURL) {
      URL.revokeObjectURL(photoPreviews.value[index]!)
    }
    photoPreviews.value[index] = null
  }
}

async function handleSubmit() {
  if (saving.value) return
  formError.value = null
  savedMessage.value = null

  if (!fullName.value.trim() || !phoneNumber.value.trim()) {
    formError.value = 'กรุณากรอกชื่อ-นามสกุลและเบอร์โทรศัพท์สำหรับติดต่อกลับ'
    return
  }
  if (arsenicLevel.value === null) {
    formError.value = 'กรุณาเลือกระดับสารหนู'
    return
  }
  if (!parsedCoordinates.value) {
    formError.value = 'กรุณาบันทึกพิกัด GPS ปัจจุบัน'
    return
  }
  if (!publicConsent.value) {
    formError.value = 'กรุณายินยอมเผยแพร่พิกัด GPS และผลตรวจบนแผนที่สาธารณะ'
    return
  }
  if (photoErrors.value.some(Boolean)) {
    formError.value = 'กรุณาเลือกไฟล์ภาพที่รองรับ'
    return
  }

  saving.value = true
  try {
    const recordedNow = new Date().toISOString()
    const waypoint = await submitWaterSurvey({
      fullName: fullName.value,
      phoneNumber: phoneNumber.value,
      arsenicLevelPpb: arsenicLevel.value,
      coordinates: parsedCoordinates.value,
      gpsAccuracyMeters: gpsAccuracyMeters.value,
      photos: photos.value,
      turnstileToken: '',
      publicConsent: publicConsent.value,
      sampleCollectedAt: recordedNow,
      waterSourceType: 'แม่น้ำ',
      rainContext: 'ไม่ทราบ',
    })

    // Capture submitted photos for UI success display
    const uploadedSnap: Array<{ url: string; name: string }> = []
    photos.value.forEach((photo, idx) => {
      if (photo && photoPreviews.value[idx]) {
        uploadedSnap.push({
          url: photoPreviews.value[idx]!,
          name: photo.name,
        })
      }
    })
    submittedPhotos.value = uploadedSnap

    const reviewStatus = arsenicLevel.value > 50 ? 'pending_review' : 'auto_published'
    const contributor = waypoint.contributor_label || 'ผู้ส่งผลตรวจ'
    const feedbackText =
      reviewStatus === 'pending_review'
        ? `บันทึกรหัส ${waypoint.sample_code} (${arsenicLevel.value} ppb > 50 ppb) ในนาม "${contributor}" เข้าคิวรอผู้ดูแลระบบตรวจสอบก่อนแสดงผลสาธารณะ (R10)`
        : `บันทึกผลสำรวจรหัส ${waypoint.sample_code} (${arsenicLevel.value} ppb) ในนาม "${contributor}" เผยแพร่บนแผนที่สาธารณะเรียบร้อยแล้ว`

    emit('submitted', {
      waypoint,
      waterSourceType: 'แม่น้ำ',
      rainContext: 'ไม่ทราบ',
      sampleCollectedAt: recordedNow,
      reviewStatus,
      feedbackMessage: feedbackText,
    })

    // ล้างค่าฟอร์มและปิด modal ทันทีตามที่ผู้ใช้สั่ง
    fullName.value = ''
    phoneNumber.value = ''
    arsenicLevel.value = null
    latText.value = ''
    lonText.value = ''
    gpsAccuracyMeters.value = null
    photos.value.forEach((_, idx) => removePhoto(idx as 0 | 1))
    photos.value = [null, null]
    photoErrors.value = [null, null]
    publicConsent.value = false
    savedMessage.value = null
    formError.value = null
    emit('close')
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'บันทึกแบบสำรวจไม่สำเร็จ กรุณาลองใหม่'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    @mousedown.self="closeModal"
  >
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="survey-title"
      class="wv-card max-h-[92vh] w-full max-w-2xl overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 text-slate-900 shadow-2xl dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-white"
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
              <p class="text-xs text-slate-500 dark:text-[#98A2A8]">
                บันทึกผลตรวจชุดทดสอบสารหนูภาคสนาม 9 ระดับ
              </p>
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

        <!-- Privacy Notice -->
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

        <!-- Contact Fields -->
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-200">
            ชื่อ-นามสกุล / Full Name <span class="text-rose-600 dark:text-[#FF453A]">*จำเป็น</span>
            <input
              v-model="fullName"
              type="text"
              autocomplete="name"
              maxlength="200"
              class="wv-input mt-1 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white"
              placeholder="ระบุชื่อ-นามสกุลผู้เก็บตัวอย่าง"
              :disabled="saving"
            >
          </label>

          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-200">
            เบอร์โทรศัพท์ / Phone Number <span class="text-rose-600 dark:text-[#FF453A]">*จำเป็น</span>
            <input
              v-model="phoneNumber"
              type="tel"
              autocomplete="tel"
              maxlength="40"
              class="wv-input mt-1 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white"
              placeholder="08X-XXX-XXXX"
              :disabled="saving"
            >
          </label>
        </div>

        <!-- 9 Arsenic Strip Levels (R04, R06, R10) -->
        <fieldset :disabled="saving" class="space-y-2">
          <legend class="text-xs font-semibold text-slate-800 dark:text-white">
            โปรดเลือกสีที่ตรงกับผลตรวจของท่าน (Arsenic Level 9 ระดับ) <span class="text-rose-600 dark:text-[#FF453A]">*ต้องระบุ</span>
          </legend>
          <div
            role="radiogroup"
            aria-label="ระดับสารหนู (As) หน่วย ppb"
            class="grid grid-cols-3 gap-2 sm:grid-cols-9"
          >
            <button
              v-for="(item, idx) in levels"
              :key="item.ppb"
              type="button"
              role="radio"
              :aria-checked="arsenicLevel === item.ppb"
              :aria-label="`${idx + 1}: ${item.ppb} ppb`"
              class="flex flex-col items-center justify-between rounded-xl border p-1.5 text-center transition"
              :class="
                arsenicLevel === item.ppb
                  ? 'border-2 border-sky-600 bg-sky-50 shadow-sm dark:border-[#00E5FF] dark:bg-[#252525]'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-[#2C2C2E] dark:bg-[#141416] dark:hover:bg-[#252525]'
              "
              @click="arsenicLevel = item.ppb; formError = null"
            >
              <span class="wv-mono text-[11px] text-slate-400 dark:text-[#98A2A8]">#{{ idx + 1 }}</span>
              <span
                class="my-1 block h-5.5 w-full rounded-md border shadow-inner"
                :style="{ backgroundColor: item.color || item.hex, borderColor: item.borderColor || 'rgba(0,0,0,0.2)' }"
              />
              <span class="wv-mono text-xs font-bold text-slate-900 dark:text-white">{{ item.ppb }} ppb</span>
            </button>
          </div>

          <div v-if="selectedLevelMeta" class="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="font-semibold text-slate-800 dark:text-white">
                ผลที่เลือก: <strong class="wv-mono text-sky-700 dark:text-[#00E5FF]">{{ selectedLevelMeta.ppb }} ppb</strong>
                ({{ selectedLevelMeta.status === 'auto_published' ? 'เผยแพร่อัตโนมัติ <= 50 ppb' : 'เข้าคิวรอแอดมินตรวจ > 50 ppb' }})
              </span>
              <span
                class="rounded-md px-2 py-0.5 font-semibold"
                :class="selectedLevelMeta.ppb > 50 ? 'bg-rose-50 border border-rose-200 text-rose-700 dark:bg-[#3A1C1C] dark:text-[#FF453A]' : 'bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-[#32D74B]/20 dark:text-[#32D74B]'"
              >
                {{ selectedLevelMeta.action }}
              </span>
            </div>
            <p class="mt-0.5 text-slate-500 dark:text-[#98A2A8]">
              หมายเหตุ: หากค่าเกิน 50 ppb จะต้องรอผู้ดูแลระบบตรวจสอบก่อนแสดงบนแผนที่ (เกณฑ์มาตรฐานน้ำผิวดิน กรมควบคุมมลพิษ คือ 10 ppb)
            </p>
          </div>
        </fieldset>

        <!-- Location GPS & Manual Input (R04) -->
        <fieldset :disabled="saving" class="space-y-2">
          <legend class="text-xs font-semibold text-slate-800 dark:text-white">
            ระบุพิกัดที่ตั้ง (Location) <span class="text-rose-600 dark:text-[#FF453A]">*ต้องระบุพิกัดที่ตั้ง</span>
          </legend>
          <button
            type="button"
            class="wv-btn-secondary w-full justify-center border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-white transition py-1.5"
            :disabled="locationState === 'loading'"
            @click="captureLocation"
          >
            <MapPin class="h-4 w-4 text-sky-600 dark:text-[#00E5FF]" />
            <span>{{ locationState === 'loading' ? 'กำลังค้นหาตำแหน่ง…' : 'กดปุ่มเพื่อพิกัด GPS ปัจจุบัน' }}</span>
            <Crosshair class="h-4 w-4 text-emerald-600 dark:text-[#32D74B]" />
          </button>

          <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <label class="block text-xs font-semibold text-slate-700 dark:text-[#98A2A8]">
              ละติจูด
              <input
                v-model="latText"
                aria-label="ละติจูด"
                type="number"
                step="any"
                placeholder="ยังไม่ทราบ"
                class="wv-input wv-mono mt-0.5 border-slate-300 bg-white text-slate-900 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white"
                @input="gpsAccuracyMeters = null"
              >
            </label>
            <label class="block text-xs font-semibold text-slate-700 dark:text-[#98A2A8]">
              ลองจิจูด
              <input
                v-model="lonText"
                aria-label="ลองจิจูด"
                type="number"
                step="any"
                placeholder="ยังไม่ทราบ"
                class="wv-input wv-mono mt-0.5 border-slate-300 bg-white text-slate-900 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white"
                @input="gpsAccuracyMeters = null"
              >
            </label>
          </div>
          <p v-if="gpsAccuracyMeters !== null" class="text-xs text-emerald-600 dark:text-[#32D74B]">
            ความแม่นยำ GPS ประมาณ {{ gpsAccuracyMeters }} เมตร
          </p>
        </fieldset>

        <!-- 2 Optional Photos (R04) -->
        <fieldset :disabled="saving" class="space-y-2">
          <legend class="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-white">
            <Camera class="h-4 w-4 text-sky-600 dark:text-[#00E5FF]" />
            <span>แนบรูปถ่ายการเก็บตัวอย่าง (สูงสุด 2 ภาพ เก็บเป็นความลับ)</span>
          </legend>
          <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div
              v-for="idx in ([0, 1] as const)"
              :key="idx"
              class="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-[#2C2C2E] dark:bg-[#141416] flex flex-col justify-between gap-1.5"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-800 dark:text-white">ภาพที่ {{ idx + 1 }}</span>
                <span v-if="photos[idx]" class="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">แนบไฟล์แล้ว</span>
              </div>

              <!-- Preview thumbnail when selected -->
              <div v-if="photoPreviews[idx]" class="relative my-1 flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-2 dark:border-[#2C2C2E] dark:bg-[#1E1E1E]">
                <img
                  :src="photoPreviews[idx]!"
                  :alt="`ตัวอย่างภาพที่ ${idx + 1}`"
                  class="h-14 w-14 shrink-0 rounded-md object-cover border border-slate-200 dark:border-[#2C2C2E]"
                >
                <div class="min-w-0 flex-1">
                  <p class="truncate text-xs font-medium text-slate-800 dark:text-slate-200">{{ photos[idx]?.name }}</p>
                  <p class="text-[10px] text-slate-500 dark:text-[#98A2A8]">
                    {{ photos[idx] ? (photos[idx]!.size / 1024).toFixed(1) + ' KB' : '' }}
                  </p>
                </div>
              </div>

              <label class="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-2 text-xs text-slate-600 hover:border-sky-500 hover:bg-sky-50/50 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-[#98A2A8] dark:hover:border-[#00E5FF] dark:hover:text-white transition">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  :aria-label="`เลือกภาพที่ ${idx + 1}`"
                  class="sr-only"
                  @change="onSelectPhoto(idx, $event)"
                >
                <Camera class="h-4 w-4 shrink-0 text-sky-600 dark:text-[#00E5FF]" />
                <span class="truncate">{{ photos[idx] ? 'เปลี่ยนภาพใหม่' : 'คลิกเพื่อเลือกภาพ (JPG, PNG, WebP <= 10MB)' }}</span>
              </label>
              <button
                v-if="photos[idx]"
                type="button"
                :aria-label="`ลบภาพที่ ${idx + 1}`"
                class="self-start text-xs text-rose-600 dark:text-[#FF453A] underline"
                @click="removePhoto(idx)"
              >
                ลบภาพนี้
              </button>
              <p v-if="photoErrors[idx]" role="alert" class="text-xs text-rose-600 dark:text-[#FF453A]">
                {{ photoErrors[idx] }}
              </p>
            </div>
          </div>
        </fieldset>

        <!-- Explicit Public Consent -->
        <label class="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-slate-300">
          <input
            v-model="publicConsent"
            type="checkbox"
            class="mt-0.5 h-4 w-4 accent-sky-600 dark:accent-[#00E5FF]"
            :disabled="saving"
            @change="formError = null"
          >
          <span>
            ยินยอมให้แสดงพิกัดและผลตรวจสารหนูบนแผนที่สาธารณะ โดยชื่อ-นามสกุล เบอร์โทรศัพท์ และรูปถ่ายจะถูกเก็บรักษาเป็นความลับ ไม่แสดงบนแผนที่
          </span>
        </label>

        <p v-if="formError" role="alert" class="wv-alert-box text-xs font-medium">
          {{ formError }}
        </p>
        <div
          v-if="savedMessage"
          ref="statusBoxRef"
          class="wv-live-box space-y-2.5 rounded-xl border border-emerald-300 bg-emerald-50/90 p-3 text-xs text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          <div class="flex items-start gap-2">
            <CheckCircle2 class="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <p role="status" class="font-medium leading-relaxed">
              {{ savedMessage }}
            </p>
          </div>

          <!-- Uploaded photos gallery -->
          <div v-if="submittedPhotos.length > 0" class="pt-2 border-t border-emerald-200/80 dark:border-emerald-800/60">
            <div class="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 mb-1.5 flex items-center gap-1.5">
              <Camera class="h-3.5 w-3.5" />
              <span>ภาพถ่ายตัวอย่างที่อัปโหลดเข้าสู่ระบบ ({{ submittedPhotos.length }} ภาพ)</span>
            </div>
            <div class="flex flex-wrap gap-2.5">
              <div
                v-for="(photo, i) in submittedPhotos"
                :key="i"
                class="relative group rounded-lg overflow-hidden border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-black/40 shadow-sm"
              >
                <img
                  :src="photo.url"
                  :alt="photo.name || `ภาพตัวอย่างที่ ${i + 1}`"
                  class="h-20 w-20 object-cover"
                >
                <div class="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5 text-[9px] text-white truncate text-center">
                  {{ photo.name || `ภาพที่ ${i + 1}` }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer class="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-[#2C2C2E] pt-3">
          <button
            type="button"
            class="wv-btn-secondary"
            :disabled="saving"
            @click="closeModal"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            class="wv-btn-primary"
            :disabled="saving"
          >
            {{ saving ? 'กำลังบันทึก…' : 'ส่งข้อมูลบันทึก' }}
          </button>
        </footer>
      </form>
    </section>
  </div>
</template>

<style scoped>
section[role="dialog"] {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

section[role="dialog"]::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}
</style>
