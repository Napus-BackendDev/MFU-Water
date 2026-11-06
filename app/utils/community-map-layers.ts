import floodHistory from '../../data/public-flood-history.json'
import evacuationReference from '../../data/public-evacuation-reference.json'
import { publicMapData } from './map-data-public'

export type CommunityMapType = 'hamlets' | 'chemical' | 'places' | 'evacuation' | 'flood'
export const publicFloodHistory = floodHistory
export const publicEvacuationReference = evacuationReference

export function hasPublicMapLayer(communityId: string, type: CommunityMapType) {
  // สารเคมีปนเปื้อน (จุดสำรวจ) และหย่อมบ้าน (การ์ดรู้จักชุมชน) เปิดใช้งานได้ทุกชุมชน
  if (type === 'chemical' || type === 'hamlets') return true

  // 'สถานที่สำคัญ' เปิดเมื่อผู้ดูแลเผยแพร่สถานที่ของชุมชนนั้นแล้ว (รวมรายการรอผูกจุด) ยังไม่มีก็ปิดปุ่มเหมือนเดิม
  if (type === 'places') {
    const counts = publicMapData.placesByCommunity
    return communityId === 'all' ? Object.values(counts).some((count) => count > 0) : (counts[communityId] ?? 0) > 0
  }

  const isAvailable = communityId === 'thaton' || communityId === 'all'
  return isAvailable && (
    (type === 'evacuation' && evacuationReference.points.length > 0) ||
    (type === 'flood' && floodHistory.features.length > 0)
  )
}
