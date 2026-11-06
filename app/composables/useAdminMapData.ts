import { ref } from 'vue'
import type { CommunityId } from '../../src/lib/map-data'
import { createMapDataClient, MapDataError } from '../utils/map-data-admin'

// สถานะร่วมของหน้าแอดมิน "ข้อมูลแผนที่": ข้อความแจ้งผล สถานะกำลังทำงาน และโหมดดูตามหน้าบ้าน (รูปแบบเดียวกับ useAdminNews)
export function useAdminMapData(onSessionExpired?: (message: string) => void, initialCommunity: CommunityId = 'thaton') {
  const client = createMapDataClient(onSessionExpired)
  const feedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)
  const busy = ref<string | null>(null)
  const community = ref<CommunityId>(initialCommunity)
  // เปิดแล้วแผนที่แสดงเฉพาะสิ่งที่หน้าบ้านเห็นจริง (เผยแพร่แล้ว ไม่รวมหัวข้อที่ซ่อน) ปิดแล้วเห็นทั้งหมดรวมฉบับร่าง
  const publicView = ref(false)

  // รันคำสั่งหนึ่งครั้ง: ตั้งสถานะ จับข้อผิดพลาดเป็นข้อความไทย แล้วคืนค่า (หรือ null เมื่อไม่สำเร็จ)
  async function run<T>(label: string, task: () => Promise<T>, successMessage?: string): Promise<T | null> {
    busy.value = label
    if (successMessage !== undefined) feedback.value = null
    try {
      const result = await task()
      if (successMessage) feedback.value = { type: 'success', message: successMessage }
      return result
    } catch (error) {
      if (!(error instanceof MapDataError && error.status === 401)) feedback.value = { type: 'error', message: error instanceof Error ? error.message : 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่' }
      return null
    } finally {
      busy.value = null
    }
  }

  return { client, feedback, busy, community, publicView, run }
}

export type AdminMapData = ReturnType<typeof useAdminMapData>
