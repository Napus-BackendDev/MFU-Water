import type { SupabaseClient } from '@supabase/supabase-js'
import { turnstileEnabled } from '../config/env'

export const arsenicLevels = [0, 5, 10, 30, 50, 100, 200, 300, 500] as const
export const surveyPhotoBucket = 'survey-photos'
export const maxSurveyPhotoBytes = 10 * 1024 * 1024

export type SurveyCoordinates = { latitude: number; longitude: number }
export type SurveyPhoto = File | null
export type SurveyWaypoint = {
  id: string
  sample_code: string
  arsenic_level_ppb: number
  latitude: number
  longitude: number
  gps_accuracy_meters: number | null
  created_at: string
}

export type WaterSurveyInput = {
  fullName: string
  phoneNumber: string
  arsenicLevelPpb: number
  coordinates: SurveyCoordinates | null
  gpsAccuracyMeters: number | null
  photos: [SurveyPhoto, SurveyPhoto]
  turnstileToken: string
  publicConsent: boolean
  sampleCollectedAt?: string | null
  waterSourceType?: 'แม่น้ำ' | 'บ่อ' | 'ประปา' | null
  rainContext?: 'ไม่ทราบ' | 'ไม่ตก' | 'ตก' | null
}

const imageTypes = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/webp': [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50],
} as const

export async function fetchSurveyWaypoints(_client?: SupabaseClient | null): Promise<SurveyWaypoint[]> {
  const response = await fetch('/api/surveys/waypoints', { headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error('โหลดจุดสำรวจไม่สำเร็จ')
  const payload: unknown = await response.json()
  if (!Array.isArray(payload)) throw new Error('ข้อมูลจุดสำรวจไม่ถูกต้อง')
  return payload as SurveyWaypoint[]
}

export async function validateSurveyPhoto(file: File): Promise<string | null> {
  if (!(file.type in imageTypes)) return 'รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP'
  if (file.size <= 0 || file.size > maxSurveyPhotoBytes) return 'รูปภาพต้องมีขนาดไม่เกิน 10 MB'
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const signature = imageTypes[file.type as keyof typeof imageTypes]
  return signature.every((byte, index) => byte === null || bytes[index] === byte) ? null : 'เนื้อหาไฟล์ไม่ตรงกับชนิดรูปภาพที่เลือก'
}

function validateSurveyInput(input: WaterSurveyInput): string | null {
  if (!arsenicLevels.includes(input.arsenicLevelPpb as (typeof arsenicLevels)[number])) return 'กรุณาเลือกระดับสารหนูจากตัวเลือกที่กำหนด'
  if (!input.fullName.trim() || !input.phoneNumber.trim()) return 'กรุณากรอกชื่อ-นามสกุลและเบอร์โทรศัพท์สำหรับติดต่อกลับภายใน'
  if (input.fullName.trim().length > 200 || input.phoneNumber.trim().length > 40) return 'ชื่อหรือเบอร์โทรศัพท์ยาวเกินกำหนด'
  const { coordinates } = input
  if (!coordinates || !Number.isFinite(coordinates.latitude) || !Number.isFinite(coordinates.longitude)
    || coordinates.latitude < -90 || coordinates.latitude > 90
    || coordinates.longitude < -180 || coordinates.longitude > 180) return 'กรุณาบันทึกพิกัด GPS ก่อนส่งแบบสำรวจ'
  if (input.gpsAccuracyMeters !== null && (!Number.isInteger(input.gpsAccuracyMeters) || input.gpsAccuracyMeters < 0)) return 'ค่าความแม่นยำ GPS ไม่ถูกต้อง'
  if (turnstileEnabled && !input.turnstileToken) return 'กรุณายืนยัน CAPTCHA ก่อนส่งแบบสำรวจ'
  if (!input.publicConsent) return 'กรุณายินยอมเผยแพร่พิกัด GPS และผลตรวจบนแผนที่สาธารณะ'
  return null
}

type PrepareResponse = {
  ticket: string
  uploads: Array<{ index: number; path: string; token: string }>
}

export async function submitWaterSurvey(
  client: SupabaseClient | null,
  input: WaterSurveyInput,
): Promise<SurveyWaypoint> {
  const inputError = validateSurveyInput(input)
  if (inputError) throw new Error(inputError)
  for (const photo of input.photos) {
    if (photo) {
      const photoError = await validateSurveyPhoto(photo)
      if (photoError) throw new Error(photoError)
    }
  }
  if (input.photos.some(Boolean) && !client) throw new Error('ไม่พบการตั้งค่า Supabase สำหรับอัปโหลดภาพ')

  const payload = {
    fullName: input.fullName.trim(),
    phoneNumber: input.phoneNumber.trim(),
    arsenicLevelPpb: input.arsenicLevelPpb,
    coordinates: input.coordinates,
    gpsAccuracyMeters: input.gpsAccuracyMeters,
    photoTypes: input.photos.map((photo) => photo?.type ?? null),
    publicConsent: input.publicConsent,
    turnstileToken: input.turnstileToken,
    sampleCollectedAt: input.sampleCollectedAt ?? null,
    waterSourceType: input.waterSourceType ?? null,
    rainContext: input.rainContext ?? null,
  }
  const prepareResponse = await fetch('/api/surveys/prepare', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const prepared = await readApiResponse<PrepareResponse>(prepareResponse, 'เตรียมรายการไม่สำเร็จ')

  try {
    for (const upload of prepared.uploads) {
      const photo = input.photos[upload.index]
      if (!photo || !client) throw new Error('ข้อมูลไฟล์อัปโหลดไม่ถูกต้อง')
      const { error } = await client.storage.from(surveyPhotoBucket).uploadToSignedUrl(upload.path, upload.token, photo, {
        contentType: photo.type,
        upsert: false,
      })
      if (error) throw new Error('อัปโหลดรูปภาพไม่สำเร็จ กรุณาตรวจไฟล์แล้วลองใหม่')
    }

    const completeResponse = await fetch('/api/surveys/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ticket: prepared.ticket,
        fullName: payload.fullName,
        phoneNumber: payload.phoneNumber,
        arsenicLevelPpb: payload.arsenicLevelPpb,
        coordinates: payload.coordinates,
        gpsAccuracyMeters: payload.gpsAccuracyMeters,
      }),
    })
    return await readApiResponse<SurveyWaypoint>(completeResponse, 'บันทึกแบบสำรวจไม่สำเร็จ กรุณาลองใหม่')
  } catch (error) {
    throw error instanceof Error ? error : new Error('บันทึกแบบสำรวจไม่สำเร็จ กรุณาลองใหม่')
  }
}

async function readApiResponse<T>(response: Response, fallback: string): Promise<T> {
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
      ? payload.error
      : fallback
    throw new Error(message)
  }
  return payload as T
}
