export type HouseholdLevel = 1 | 2 | 4 | 5

export interface EvacuationDestination {
  id: string
  kind: 'shelter' | 'assembly'
  label: string
  latitude: number
  longitude: number
  metres?: number
}

export interface HouseholdSourceRecord {
  id: string
  latitude: number
  longitude: number
  status: string
  color: string
  fields: {
    โซน?: string
    จำนวนสมาชิกเปราะบาง_คน?: string | number
    ประวัติน้ำท่วมบ้าน?: string
    อุบัติเหตุรุนแรงจากน้ำ?: string
    [key: string]: unknown
  }
}

export type EvacuationCaseStatus = 'waiting' | 'en_route' | 'arrived'

export interface EvacuationQueueItem {
  id: string
  householdId?: string
  rank: number
  manualRank: number | null
  level: 1 | 2 | 4
  status: EvacuationCaseStatus
  zone: string
  members: number
  flooded: boolean
  accident: boolean
  latitude: number
  longitude: number
  destinationId: string
  destinationLabel: string
  destinationMetres: number
  distanceMetres: number
}

export interface EvacuationLevelGroup {
  level: 1 | 2 | 4 | 5
  label: string
  shortLabel: string
  color: string
  count: number
  inQueue: boolean
}

export const EVACUATION_LEVEL_GROUPS: Record<HouseholdLevel, { label: string; shortLabel: string; color: string; inQueue: boolean }> = {
  1: { label: 'วิกฤตสูงสุด (มีสมาชิกเปราะบาง + บ้านเคยท่วม)', shortLabel: 'วิกฤตสูงสุด', color: '#A52714', inQueue: true },
  2: { label: 'มีสมาชิกเปราะบาง (บ้านไม่เคยท่วม)', shortLabel: 'มีเปราะบาง', color: '#E65100', inQueue: true },
  4: { label: 'เคยท่วมบ้าน (ไม่มีสมาชิกเปราะบาง)', shortLabel: 'เคยท่วม', color: '#673AB7', inQueue: true },
  5: { label: 'ปกติ', shortLabel: 'ปกติ', color: '#0F9D58', inQueue: false },
}

/**
 * คำนวณระยะทางเส้นตรงบนทรงกลมโลก (Haversine formula) ในหน่วยเมตร
 */
export function haversineDistanceMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * ค้นหาจุดหมายที่ใกล้ที่สุด (ศูนย์พักพิง หรือ จุดรวมพล)
 */
export function findNearestDestination(
  latitude: number,
  longitude: number,
  destinations: EvacuationDestination[],
): { destination: EvacuationDestination; metres: number } | null {
  if (!destinations.length) return null
  let nearest: EvacuationDestination = destinations[0]!
  let minMetres = Infinity
  for (const dest of destinations) {
    const metres = haversineDistanceMetres(latitude, longitude, dest.latitude, dest.longitude)
    if (metres < minMetres) {
      minMetres = metres
      nearest = dest
    }
  }
  return { destination: nearest, metres: minMetres }
}

/**
 * แยกสกัดระดับ 1, 2, 4 หรือ 5 จากฟิลด์ status
 */
export function extractHouseholdLevel(status: string): HouseholdLevel {
  const match = status.trim().match(/^([1245])/)
  if (match) return parseInt(match[1]!, 10) as HouseholdLevel
  return 5
}

/**
 * จัดคิวอพยพตามกติกาข้อ 2.3 ของคู่มือ handoff
 * 1. ตัดระดับ 5 ออก
 * 2. เรียงระดับน้อยไปมาก (1 → 2 → 4)
 * 3. สมาชิกเปราะบางมากกว่าไปก่อน
 * 4. เคยประสบอุบัติเหตุรุนแรงจากน้ำไปก่อน
 * 5. บ้านที่ไกลจากที่หมายใกล้สุดมากกว่าไปก่อน (haversine)
 * 6. เรียงตาม id เพื่อความเสถียร
 * 7. ถ้ามี manualRank / ลำดับที่ลากเอง ลำดับที่ลากเองชนะลำดับอัตโนมัติ
 */
export function buildEvacuationQueue(
  records: HouseholdSourceRecord[],
  destinations: EvacuationDestination[],
  casesStateMap: Map<string, { status: EvacuationCaseStatus; manualRank: number | null }> = new Map(),
): EvacuationQueueItem[] {
  const queuedItems: EvacuationQueueItem[] = []

  for (const record of records) {
    const level = extractHouseholdLevel(record.status)
    if (level === 5) continue

    const nearestMatch = findNearestDestination(record.latitude, record.longitude, destinations)
    const destination = nearestMatch?.destination ?? {
      id: 'TH-SHELTER-01',
      kind: 'shelter',
      label: 'ศูนย์พักพิงตามแผน',
      latitude: 20.05842,
      longitude: 99.35875,
    }
    const distanceMetres = nearestMatch?.metres ?? 0
    const rawMembers = record.fields?.['จำนวนสมาชิกเปราะบาง_คน']
    const members = typeof rawMembers === 'number' ? rawMembers : parseFloat(String(rawMembers || 0)) || 0
    const accident = (record.fields?.['อุบัติเหตุรุนแรงจากน้ำ'] || '').trim() !== 'ไม่มี'
    const flooded = (record.fields?.['ประวัติน้ำท่วมบ้าน'] || '').trim() === 'เคยท่วมบ้าน'
    const zone = (record.fields?.['โซน'] || 'ไม่ระบุหย่อม').trim()

    const caseState = casesStateMap.get(record.id)
    const status: EvacuationCaseStatus = caseState?.status ?? 'waiting'
    const manualRank: number | null = caseState?.manualRank ?? null

    queuedItems.push({
      id: record.id,
      rank: 0,
      manualRank,
      level: level as 1 | 2 | 4,
      status,
      zone,
      members,
      flooded,
      accident,
      latitude: record.latitude,
      longitude: record.longitude,
      destinationId: destination.id,
      destinationLabel: destination.label,
      destinationMetres: distanceMetres,
      distanceMetres,
    })
  }

  // แยกกลุ่มที่มี manualRank และกลุ่มอัตโนมัติ
  // ถ้ามีการลากลำดับเอง (manualRank !== null) ให้เรียง manualRank นำหน้า
  queuedItems.sort((a, b) => {
    const hasManualA = a.manualRank !== null && Number.isFinite(a.manualRank)
    const hasManualB = b.manualRank !== null && Number.isFinite(b.manualRank)

    if (hasManualA && hasManualB) {
      return (a.manualRank as number) - (b.manualRank as number)
    }
    if (hasManualA) return -1
    if (hasManualB) return 1

    // 2. เรียงระดับน้อยไปมาก (1 → 2 → 4)
    if (a.level !== b.level) return a.level - b.level

    // 3. สมาชิกเปราะบางมากกว่าไปก่อน
    if (b.members !== a.members) return b.members - a.members

    // 4. อุบัติเหตุรุนแรงจากน้ำก่อน
    if (a.accident !== b.accident) return (b.accident ? 1 : 0) - (a.accident ? 1 : 0)

    // 5. ระยะทางไกลสุดก่อน
    if (Math.abs(b.distanceMetres - a.distanceMetres) > 0.001) {
      return b.distanceMetres - a.distanceMetres
    }

    // 6. ตาม id เพื่อผลคงที่
    return a.id.localeCompare(b.id)
  })

  // กำหนดอันดับ rank (1, 2, 3, ...)
  queuedItems.forEach((item, index) => {
    item.rank = index + 1
  })

  return queuedItems
}

/**
 * สรุปจำนวนครัวเรือนตาม 4 ระดับ (1, 2, 4, 5)
 */
export function summarizeHouseholdLevels(records: HouseholdSourceRecord[]): EvacuationLevelGroup[] {
  const counts: Record<HouseholdLevel, number> = { 1: 0, 2: 0, 4: 0, 5: 0 }
  for (const r of records) {
    const level = extractHouseholdLevel(r.status)
    counts[level] = (counts[level] || 0) + 1
  }

  const levels: HouseholdLevel[] = [1, 2, 4, 5]
  return levels.map((lvl) => ({
    level: lvl,
    label: EVACUATION_LEVEL_GROUPS[lvl].label,
    shortLabel: EVACUATION_LEVEL_GROUPS[lvl].shortLabel,
    color: EVACUATION_LEVEL_GROUPS[lvl].color,
    count: counts[lvl] || 0,
    inQueue: EVACUATION_LEVEL_GROUPS[lvl].inQueue,
  }))
}
