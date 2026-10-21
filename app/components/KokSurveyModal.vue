<script setup lang="ts">
import { computed, ref } from 'vue'
import { Camera, ClipboardList, Crosshair, MapPin, ShieldCheck, Trash2, X } from 'lucide-vue-next'
import {
  submitWaterSurvey,
  validateSurveyPhoto,
  type SurveyCoordinates,
  type SurveyPhoto,
  type SurveyWaypoint,
} from '../../src/lib/survey'
import { supabase } from '../../src/lib/supabase'
import { contractData } from '../utils/kok-contract'

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
  }): void
}>()

const fullName = ref('')
const phoneNumber = ref('')
const arsenicLevel = ref<number | null>(null)
const latText = ref('')
const lonText = ref('')
const gpsAccuracyMeters = ref<number | null>(null)
const locationState = ref<'idle' | 'loading' | 'error'>('idle')
const waterSourceType = ref<'แม่น้ำ' | 'บ่อ' | 'ประปา'>('แม่น้ำ')
const rainContext = ref<'ไม่ทราบ' | 'ไม่ตก' | 'ตก'>('ไม่ทราบ')
const sampleCollectedAt = ref(new Date().toISOString().slice(0, 16))
const photos = ref<[SurveyPhoto, SurveyPhoto]>([null, null])
const photoErrors = ref<[string | null, string | null]>([null, null])
const publicConsent = ref(false)
const formError = ref<string | null>(null)
const saving = ref(false)
const savedMessage = ref<string | null>(null)

// R05 Contact removal request state
const showRemovalBox = ref(false)
const removalSampleCode = ref('')
const removalPhone = ref('')
const removalStatus = ref<string | null>(null)

const levels = contractData.levels

const parsedCoordinates = computed<SurveyCoordinates | null>(() => {
  if (latText.value.trim() === '' || lonText.value.trim() === '') return null
  const latitude = Number(latText.value)
  const longitude = Number(lonText.value)
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
    input.value = ''
    return
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
}

async function handleSubmit() {
  formError.value = null
  savedMessage.value = null

  if (!fullName.value.trim() || !phoneNumber.value.trim()) {
    formError.value = 'กรุณากรอกชื่อ-นามสกุลและเบอร์โทรศัพท์สำหรับติดต่อกลับภายใน (R05)'
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
    const waypoint = await submitWaterSurvey(supabase, {
      fullName: fullName.value,
      phoneNumber: phoneNumber.value,
      arsenicLevelPpb: arsenicLevel.value,
      coordinates: parsedCoordinates.value,
      gpsAccuracyMeters: gpsAccuracyMeters.value,
      photos: photos.value,
      turnstileToken: '',
      publicConsent: publicConsent.value,
      sampleCollectedAt: sampleCollectedAt.value,
      waterSourceType: waterSourceType.value,
      rainContext: rainContext.value,
    })
    const reviewStatus = arsenicLevel.value > 50 ? 'pending_review' : 'auto_published'
    emit('submitted', {
      waypoint,
      waterSourceType: waterSourceType.value,
      rainContext: rainContext.value,
      sampleCollectedAt: sampleCollectedAt.value,
      reviewStatus,
    })
    savedMessage.value =
      reviewStatus === 'pending_review'
        ? `บันทึกรหัส ${waypoint.sample_code} (${arsenicLevel.value} ppb > 50 ppb) เข้าคิวรอผู้ดูแลระบบตรวจสอบก่อนแสดงผลสาธารณะ (R10)`
        : `บันทึกผลสำรวจรหัส ${waypoint.sample_code} (${arsenicLevel.value} ppb) เผยแพร่บนแผนที่สาธารณะเรียบร้อยแล้ว`
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'บันทึกแบบสำรวจไม่สำเร็จ กรุณาลองใหม่'
  } finally {
    saving.value = false
  }
}

function submitRemovalRequest() {
  if (!removalSampleCode.value.trim() || !removalPhone.value.trim()) {
    removalStatus.value = 'กรุณาระบุรหัสตัวอย่าง (เช่น KOK-...) และเบอร์โทรศัพท์ที่ใช้ส่งข้อมูล'
    return
  }
  removalStatus.value = `รับคำขอลบข้อมูลติดต่อภายในสำหรับรหัส ${removalSampleCode.value.trim()} แล้ว ผู้ดูแลระบบจะตรวจสอบและลบข้อมูลติดต่อออกจากระเบียนภายใน (R05)`
  removalSampleCode.value = ''
  removalPhone.value = ''
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
      class="wv-card max-h-[92vh] w-full max-w-2xl overflow-y-auto border border-[#2C2C2E] bg-[#1E1E1E] text-white"
    >
      <form novalidate class="space-y-5" @submit.prevent="handleSubmit">
        <header class="flex items-start justify-between gap-3 border-b border-[#2C2C2E] pb-4">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00E5FF]/15 text-[#00E5FF]">
              <ClipboardList class="h-6 w-6" />
            </div>
            <div>
              <h2 id="survey-title" class="wv-title">ทำแบบสำรวจ</h2>
              <p class="text-xs text-[#98A2A8]">
                บันทึกผลตรวจชุดทดสอบสารหนูภาคสนาม 9 ระดับ (R04, R05, R06, R10, R11)
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="ปิดหน้าต่าง"
            class="rounded-lg p-2 text-[#98A2A8] hover:bg-[#252525] hover:text-white"
            :disabled="saving"
            @click="closeModal"
          >
            <X class="h-5 w-5" />
          </button>
        </header>

        <!-- R05 Privacy Notice -->
        <div class="wv-info-box text-xs">
          <div class="flex items-center gap-2 font-semibold text-[#00E5FF]">
            <ShieldCheck class="h-4 w-4 shrink-0" />
            <span>การคุ้มครองข้อมูลผู้แจ้ง (R05 — บังคับกรอกภายใน ไม่แสดงต่อสาธารณะ)</span>
          </div>
          <p class="mt-1 text-[#D8F9FF]">
            ชื่อ-นามสกุล เบอร์โทรศัพท์ และไฟล์ภาพถ่ายใช้สำหรับทีมวิจัย มฟล. และผู้ประสานงานติดต่อกลับหรือตรวจสอบความถูกต้องเท่านั้น
            จะไม่แสดงในแผนที่สาธารณะ ตารางสาธารณะ หรือไฟล์ CSV ส่งออก
          </p>
        </div>

        <!-- Required Internal Contact Fields (R05) -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="block text-sm font-medium">
            ชื่อ-นามสกุล / Full Name <span class="text-[#FF453A]">*บังคับภายใน</span>
            <input
              v-model="fullName"
              type="text"
              autocomplete="name"
              maxlength="200"
              class="wv-input mt-1.5"
              placeholder="ระบุชื่อ-นามสกุลผู้เก็บตัวอย่าง"
              :disabled="saving"
            >
          </label>

          <label class="block text-sm font-medium">
            เบอร์โทรศัพท์ / Phone Number <span class="text-[#FF453A]">*บังคับภายใน</span>
            <input
              v-model="phoneNumber"
              type="tel"
              autocomplete="tel"
              maxlength="40"
              class="wv-input mt-1.5"
              placeholder="08X-XXX-XXXX"
              :disabled="saving"
            >
          </label>
        </div>

        <!-- 9 Arsenic Strip Levels (R04, R06, R10) -->
        <fieldset :disabled="saving" class="space-y-2.5">
          <legend class="text-sm font-semibold">
            โปรดเลือกสีที่ตรงกับผลตรวจของท่าน (Arsenic Level 9 ระดับ) <span class="text-[#FF453A]">*ต้องระบุ</span>
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
              class="flex flex-col items-center justify-between rounded-xl border p-2 text-center transition"
              :class="
                arsenicLevel === item.ppb
                  ? 'border-2 border-[#00E5FF] bg-[#252525]'
                  : 'border-[#2C2C2E] bg-[#141416] hover:bg-[#252525]'
              "
              @click="arsenicLevel = item.ppb; formError = null"
            >
              <span class="wv-mono text-[11px] text-[#98A2A8]">#{{ idx + 1 }}</span>
              <span
                class="my-1.5 block h-7 w-full rounded-md border border-black/30"
                :style="{ backgroundColor: item.hex }"
              />
              <span class="wv-mono text-xs font-bold text-white">{{ item.ppb }} ppb</span>
            </button>
          </div>

          <div v-if="selectedLevelMeta" class="wv-subsurface text-xs">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="font-semibold text-white">
                ผลที่เลือก: <strong class="wv-mono text-[#00E5FF]">{{ selectedLevelMeta.ppb }} ppb</strong>
                ({{ selectedLevelMeta.status === 'auto_published' ? 'เผยแพร่อัตโนมัติ <= 50 ppb' : 'เข้าคิวรอแอดมินตรวจ > 50 ppb' }})
              </span>
              <span
                class="rounded-md px-2 py-0.5 font-semibold"
                :class="selectedLevelMeta.ppb > 50 ? 'bg-[#3A1C1C] text-[#FF453A]' : 'bg-[#32D74B]/20 text-[#32D74B]'"
              >
                {{ selectedLevelMeta.action }}
              </span>
            </div>
            <p class="mt-1 text-[#98A2A8]">
              หมายเหตุ R10: เกณฑ์ 50 ppb เป็นกติกาส่งผู้ดูแลระบบตรวจสอบใน POC เท่านั้น ไม่ใช่คำรับรองว่าน้ำดื่มปลอดภัย (เกณฑ์มาตรฐานน้ำผิวดิน กรมควบคุมมลพิษ คือ 10 ppb)
            </p>
          </div>
        </fieldset>

        <!-- Location GPS & Manual Input (R04) -->
        <fieldset :disabled="saving" class="space-y-3">
          <legend class="text-sm font-semibold">
            ระบุพิกัดที่ตั้ง (Location) <span class="text-[#FF453A]">*ต้องระบุพิกัดที่ตั้ง</span>
          </legend>
          <button
            type="button"
            class="wv-btn-secondary w-full justify-center"
            :disabled="locationState === 'loading'"
            @click="captureLocation"
          >
            <MapPin class="h-4 w-4 text-[#00E5FF]" />
            <span>{{ locationState === 'loading' ? 'กำลังค้นหาตำแหน่ง…' : 'กดปุ่มเพื่อพิกัด GPS ปัจจุบัน' }}</span>
            <Crosshair class="h-4 w-4 text-[#32D74B]" />
          </button>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label class="block text-xs font-medium text-[#98A2A8]">
              ละติจูด
              <input
                v-model="latText"
                aria-label="ละติจูด"
                type="number"
                step="any"
                placeholder="ยังไม่ทราบ"
                class="wv-input wv-mono mt-1 text-white"
                @input="gpsAccuracyMeters = null"
              >
            </label>
            <label class="block text-xs font-medium text-[#98A2A8]">
              ลองจิจูด
              <input
                v-model="lonText"
                aria-label="ลองจิจูด"
                type="number"
                step="any"
                placeholder="ยังไม่ทราบ"
                class="wv-input wv-mono mt-1 text-white"
                @input="gpsAccuracyMeters = null"
              >
            </label>
          </div>
          <p v-if="gpsAccuracyMeters !== null" class="text-xs text-[#32D74B]">
            ความแม่นยำ GPS ประมาณ {{ gpsAccuracyMeters }} เมตร
          </p>
        </fieldset>

        <!-- Context Fields: Sample Date, Water Source Type, Rain Context (R04, R11) -->
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label class="block text-xs font-medium text-[#98A2A8]">
            วันและเวลาเก็บตัวอย่าง (R04)
            <input
              v-model="sampleCollectedAt"
              type="datetime-local"
              class="wv-input wv-mono mt-1 text-xs text-white"
            >
          </label>

          <label class="block text-xs font-medium text-[#98A2A8]">
            ประเภทแหล่งน้ำ (R04)
            <select v-model="waterSourceType" class="wv-input mt-1 text-xs text-white">
              <option value="แม่น้ำ">แม่น้ำ / ลำห้วย</option>
              <option value="บ่อ">บ่อน้ำตื้น / บาดาล</option>
              <option value="ประปา">ประปาหมู่บ้าน / ประปาภูเขา</option>
            </select>
          </label>

          <label class="block text-xs font-medium text-[#98A2A8]">
            ฝนในช่วงเก็บตัวอย่าง (R11 — ไม่บังคับ)
            <select v-model="rainContext" class="wv-input mt-1 text-xs text-white">
              <option value="ไม่ทราบ">ไม่ทราบ (ห้ามแปลงเป็นไม่ตก)</option>
              <option value="ไม่ตก">ไม่ตก</option>
              <option value="ตก">ตก</option>
            </select>
          </label>
        </div>

        <!-- 2 Optional Photos (R04) -->
        <fieldset :disabled="saving" class="space-y-2.5">
          <legend class="flex items-center gap-1.5 text-sm font-semibold">
            <Camera class="h-4 w-4 text-[#00E5FF]" />
            <span>แนบรูปถ่ายการเก็บตัวอย่าง (สูงสุด 2 ภาพ เก็บใน Private Bucket)</span>
          </legend>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div
              v-for="idx in ([0, 1] as const)"
              :key="idx"
              class="wv-subsurface flex flex-col justify-between gap-2"
            >
              <span class="text-xs font-semibold text-white">ภาพที่ {{ idx + 1 }}</span>
              <label class="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#2C2C2E] bg-[#141416] p-3 text-xs text-[#98A2A8] hover:border-[#00E5FF] hover:text-white">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  :aria-label="`เลือกภาพที่ ${idx + 1}`"
                  class="sr-only"
                  @change="onSelectPhoto(idx, $event)"
                >
                <Camera class="h-4 w-4 shrink-0 text-[#00E5FF]" />
                <span class="truncate">{{ photos[idx] ? photos[idx]!.name : 'คลิกเพื่อเลือกภาพ (JPG, PNG, WebP <= 10MB)' }}</span>
              </label>
              <button
                v-if="photos[idx]"
                type="button"
                :aria-label="`ลบภาพที่ ${idx + 1}`"
                class="self-start text-xs text-[#FF453A] underline"
                @click="removePhoto(idx)"
              >
                ลบภาพนี้
              </button>
              <p v-if="photoErrors[idx]" role="alert" class="text-xs text-[#FF453A]">
                {{ photoErrors[idx] }}
              </p>
            </div>
          </div>
        </fieldset>

        <!-- Explicit Public Consent (R05) -->
        <label class="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#2C2C2E] bg-[#141416] p-3 text-xs">
          <input
            v-model="publicConsent"
            type="checkbox"
            class="mt-0.5 h-4 w-4 accent-[#00E5FF]"
            :disabled="saving"
            @change="formError = null"
          >
          <span>
            ยินยอมให้เผยแพร่พิกัด GPS และผลตรวจสารหนูบนแผนที่สาธารณะ ส่วนชื่อ-นามสกุล เบอร์โทรศัพท์ และรูปถ่ายจะเก็บไว้ภายในและไม่แสดงบนแผนที่สาธารณะ (R05)
          </span>
        </label>

        <p v-if="formError" role="alert" class="wv-alert-box text-xs font-medium">
          {{ formError }}
        </p>
        <p v-if="savedMessage" role="status" class="wv-live-box text-xs font-medium">
          {{ savedMessage }}
        </p>

        <!-- R05 Contact Removal Request Toggle -->
        <div class="border-t border-[#2C2C2E] pt-3">
          <button
            type="button"
            class="flex items-center gap-1.5 text-xs text-[#98A2A8] underline hover:text-white"
            @click="showRemovalBox = !showRemovalBox"
          >
            <Trash2 class="h-3.5 w-3.5 text-[#FF453A]" />
            <span>ขอลบข้อมูลติดต่อที่เคยส่ง (R05 สิทธิผู้แจ้ง)</span>
          </button>

          <div v-if="showRemovalBox" class="wv-subsurface mt-2.5 space-y-2.5 text-xs">
            <p class="text-[#98A2A8]">
              ระบุรหัสตัวอย่างและเบอร์โทรศัพท์ที่เคยแจ้ง เพื่อให้ผู้ดูแลระบบลบชื่อและเบอร์ติดต่อออกจากระเบียนภายใน
            </p>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                v-model="removalSampleCode"
                type="text"
                placeholder="รหัสตัวอย่าง เช่น KOK-20261012-0001"
                class="wv-input text-xs"
              >
              <input
                v-model="removalPhone"
                type="tel"
                placeholder="เบอร์โทรศัพท์ที่ใช้แจ้ง"
                class="wv-input text-xs"
              >
            </div>
            <button type="button" class="wv-btn-secondary text-xs" @click="submitRemovalRequest">
              ส่งคำขอลบข้อมูลติดต่อ
            </button>
            <p v-if="removalStatus" class="text-xs text-[#00E5FF]">
              {{ removalStatus }}
            </p>
          </div>
        </div>

        <footer class="flex items-center justify-end gap-3 border-t border-[#2C2C2E] pt-4">
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
