import { computed, ref } from 'vue'
import type { SurveyCoordinates } from '../../src/lib/survey'

const geolocationErrors: Record<number, string> = {
  1: 'อนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์ก่อนบันทึกพิกัด',
  2: 'ไม่พบตำแหน่งปัจจุบัน กรุณาลองอีกครั้ง',
  3: 'ค้นหาตำแหน่งนานเกินไป กรุณาลองอีกครั้ง',
}

// Latitude/longitude fields that can be filled by hand or from the browser's GPS.
export function useGpsLocation() {
  const latText = ref('')
  const lonText = ref('')
  const accuracy = ref<number | null>(null)
  const state = ref<'idle' | 'loading' | 'error'>('idle')

  const coordinates = computed<SurveyCoordinates | null>(() => {
    const lat = String(latText.value ?? '').trim()
    const lon = String(lonText.value ?? '').trim()
    if (lat === '' || lon === '') return null
    const latitude = Number(lat)
    const longitude = Number(lon)
    return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null
  })

  // Resolves with an error message, or null when the position was captured.
  function capture(): Promise<string | null> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      state.value = 'error'
      return Promise.resolve('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง')
    }
    state.value = 'loading'
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          latText.value = String(coords.latitude)
          lonText.value = String(coords.longitude)
          accuracy.value = Number.isFinite(coords.accuracy) ? Math.round(coords.accuracy) : null
          state.value = 'idle'
          resolve(null)
        },
        ({ code }) => {
          state.value = 'error'
          resolve(geolocationErrors[code] ?? 'อ่านตำแหน่งไม่สำเร็จ กรุณาลองอีกครั้ง')
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
      )
    })
  }

  function reset() {
    latText.value = ''
    lonText.value = ''
    accuracy.value = null
    state.value = 'idle'
  }

  return { latText, lonText, accuracy, state, coordinates, capture, reset }
}
