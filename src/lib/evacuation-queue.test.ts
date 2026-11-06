import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  buildEvacuationQueue,
  extractHouseholdLevel,
  haversineDistanceMetres,
  summarizeHouseholdLevels,
  type EvacuationDestination,
  type HouseholdSourceRecord,
} from '../../app/utils/evacuation-queue'

describe('Evacuation Queue Logic (Section 2.3)', () => {
  const thatonJson = JSON.parse(readFileSync('public/mymaps/thaton.json', 'utf8'))
  const layer1 = thatonJson.layers.find((l: { id: string }) => l.id === 'layer-1')
  const thatonRecords = layer1.records as HouseholdSourceRecord[]

  const destJson = JSON.parse(readFileSync('data/public-evacuation-reference.json', 'utf8'))
  const destinations = destJson.points as EvacuationDestination[]

  it('calculates haversine distance correctly between known coordinates', () => {
    // Distance between Thaton Shelter and Assembly points
    const dist = haversineDistanceMetres(20.05842, 99.35875, 20.04983, 99.36727)
    expect(dist).toBeGreaterThan(1200)
    expect(dist).toBeLessThan(1500)
  })

  it('extracts correct levels and excludes non-existent level 3', () => {
    expect(extractHouseholdLevel('1. วิกฤตสูงสุด')).toBe(1)
    expect(extractHouseholdLevel('2. มีสมาชิกเปราะบาง')).toBe(2)
    expect(extractHouseholdLevel('4. เคยท่วมบ้าน')).toBe(4)
    expect(extractHouseholdLevel('5. ปกติ')).toBe(5)
    expect(extractHouseholdLevel('3. ไม่มีในระบบ')).toBe(5) // fallback to 5
  })

  it('summarizes household counts into the 4 official levels (129 total, 68 queued)', () => {
    const summary = summarizeHouseholdLevels(thatonRecords)
    expect(summary).toHaveLength(4)

    const map = Object.fromEntries(summary.map((s) => [s.level, s]))
    expect(map[1]?.count).toBe(4)
    expect(map[1]?.inQueue).toBe(true)

    expect(map[2]?.count).toBe(8)
    expect(map[2]?.inQueue).toBe(true)

    expect(map[4]?.count).toBe(56)
    expect(map[4]?.inQueue).toBe(true)

    expect(map[5]?.count).toBe(61)
    expect(map[5]?.inQueue).toBe(false)

    const totalQueued = summary.filter((s) => s.inQueue).reduce((acc, s) => acc + s.count, 0)
    expect(totalQueued).toBe(68)
  })

  it('builds queue of exactly 68 homes conforming to benchmark in Section 2.3', () => {
    const queue = buildEvacuationQueue(thatonRecords, destinations)
    expect(queue).toHaveLength(68)

    // Level 5 must never appear in the queue
    expect(queue.some((item) => (item.level as number) === 5)).toBe(false)

    // Benchmark from Section 2.3:
    // อันดับ 1 อยู่ระดับ 1 มีสมาชิกเปราะบาง 2 คน หย่อมสายกองกาด ไปศูนย์พักพิงตามแผนราว 644 ม.
    const rank1 = queue[0]!
    expect(rank1.rank).toBe(1)
    expect(rank1.level).toBe(1)
    expect(rank1.members).toBe(2)
    expect(rank1.zone).toBe('สายกองกาด')
    expect(rank1.destinationLabel).toBe('ศูนย์พักพิงตามแผน')
    expect(Math.round(rank1.distanceMetres)).toBe(644)

    // Max distance in queue is ~0.7 km (0.74 km)
    const maxMetres = Math.max(...queue.map((q) => q.distanceMetres))
    expect(maxMetres / 1000).toBeCloseTo(0.74, 1)

    // Check level groupings in queue: Level 1 (first 4), Level 2 (next 8), Level 4 (remaining 56)
    expect(queue.slice(0, 4).every((q) => q.level === 1)).toBe(true)
    expect(queue.slice(4, 12).every((q) => q.level === 2)).toBe(true)
    expect(queue.slice(12, 68).every((q) => q.level === 4)).toBe(true)
  })

  it('prioritizes manual order when manualRank is provided', () => {
    // Move an arbitrary item to manualRank = 1
    const targetId = 'MM1-098' // normally rank 2
    const manualMap = new Map([
      [targetId, { status: 'waiting' as const, manualRank: 1 }],
      ['MM1-054', { status: 'waiting' as const, manualRank: 2 }],
    ])

    const queue = buildEvacuationQueue(thatonRecords, destinations, manualMap)
    expect(queue[0]?.id).toBe(targetId)
    expect(queue[0]?.rank).toBe(1)
    expect(queue[1]?.id).toBe('MM1-054')
    expect(queue[1]?.rank).toBe(2)
  })

  it('guarantees deterministic stability on identical inputs', () => {
    const q1 = buildEvacuationQueue(thatonRecords, destinations)
    const q2 = buildEvacuationQueue(thatonRecords, destinations)
    expect(q1.map((q) => q.id)).toEqual(q2.map((q) => q.id))
  })
})
