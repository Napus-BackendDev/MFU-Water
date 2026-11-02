import floodHistory from '../../data/public-flood-history.json'
import evacuationReference from '../../data/public-evacuation-reference.json'

export type CommunityMapType = 'hamlets' | 'chemical' | 'places' | 'evacuation' | 'flood'
export const publicFloodHistory = floodHistory
export const publicEvacuationReference = evacuationReference

export function hasPublicMapLayer(communityId: string, type: CommunityMapType) {
  // สารเคมีปนเปื้อน (จุดสำรวจ) และหย่อมบ้าน (การ์ดรู้จักชุมชน) เปิดใช้งานได้ทุกชุมชน
  if (type === 'chemical' || type === 'hamlets') return true

  // ปิดปุ่ม 'สถานที่สำคัญ' ไม่ให้สามารถกดได้ (แต่คงแสดงปุ่มบน UI)
  if (type === 'places') return false

  const isAvailable = communityId === 'thaton' || communityId === 'all'
  return isAvailable && (
    (type === 'evacuation' && evacuationReference.points.length > 0) ||
    (type === 'flood' && floodHistory.features.length > 0)
  )
}
