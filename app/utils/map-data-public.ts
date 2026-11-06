import { reactive } from 'vue'
import type { PublicPlace } from '../../src/lib/map-data'

// ข้อมูลแผนที่ที่ผู้ดูแลแก้ได้ (สถานที่สำคัญ เส้นทางอพยพ การ์ดรู้จักชุมชน) ที่หน้าบ้านอ่านจาก /api/map-data
// ถ้า API ยังไม่พร้อมจะคงค่าว่าง และผู้ใช้ส่วนอื่นของแอปใช้ไฟล์เดิมเป็นค่าสำรอง (หน้าบ้านไม่พังเมื่อฐานข้อมูลล่ม)
export type PublicRoutes = { routes: Array<Array<[number, number]>>; alignment: string; source: string }
export type PublicProfileText = { title: string; basin: string; people: string; livelihood: string; risk: string }
export type PublicHamlet = { id: string; name: string; note: string; center: { latitude: number; longitude: number } | null; households: number; householdsLabel: string }

export const publicMapData = reactive({
  loaded: false,
  placesOk: false,
  places: { placed: [] as PublicPlace[], pending: [] as PublicPlace[] },
  placesByCommunity: {} as Record<string, number>,
  routes: null as PublicRoutes | null,
  profiles: {} as Record<string, PublicProfileText>,
  hamlets: [] as PublicHamlet[],
})

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(path)
    return response.ok ? ((await response.json()) as T) : null
  } catch {
    return null
  }
}

let pending: Promise<void> | null = null
export function loadPublicMapData(force = false): Promise<void> {
  if (force) pending = null
  pending ??= (async () => {
    const [places, routes, profiles, availability, hamlets] = await Promise.all([
      getJson<typeof publicMapData.places>('/api/map-data/places?community=all'),
      getJson<PublicRoutes>('/api/map-data/routes?community=thaton'),
      getJson<{ profiles: Record<string, PublicProfileText> }>('/api/map-data/profiles'),
      getJson<{ placesByCommunity?: Record<string, number> }>('/api/map-data/availability'),
      getJson<{ hamlets: PublicHamlet[] }>('/api/map-data/hamlets?community=all'),
    ])
    if (places) {
      publicMapData.places = places
      publicMapData.placesOk = true
    }
    if (routes?.routes?.length) publicMapData.routes = routes
    if (profiles) publicMapData.profiles = profiles.profiles
    if (availability) publicMapData.placesByCommunity = availability.placesByCommunity ?? {}
    if (hamlets?.hamlets) publicMapData.hamlets = hamlets.hamlets
    publicMapData.loaded = true
  })()
  return pending
}

// เริ่มโหลดทันทีที่ไฟล์นี้ถูกใช้ในเบราว์เซอร์ ปุ่ม “สถานที่สำคัญ” จึงรู้ว่าต้องเปิดหรือไม่โดยไม่ต้องแก้ app.vue
if (typeof window !== 'undefined') void loadPublicMapData()
