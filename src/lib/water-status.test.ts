import { describe, expect, it } from 'vitest'
import { countTodaysWaterStatuses, createPublicWaypointsCsv } from './water-status'
import type { SurveyWaypoint } from './survey'

const now = new Date('2026-09-25T06:00:00.000Z')

function waypoint(overrides: Partial<SurveyWaypoint> = {}): SurveyWaypoint {
  return {
    id: crypto.randomUUID(),
    sample_code: 'KOK-20260925-0001',
    arsenic_level_ppb: 0,
    latitude: 20.0451,
    longitude: 99.8912,
    gps_accuracy_meters: null,
    created_at: now.toISOString(),
    ...overrides,
  }
}

describe('public water status and export', () => {
  it('counts only today and applies the three arsenic levels', () => {
    const counts = countTodaysWaterStatuses([
      waypoint({ arsenic_level_ppb: 0 }),
      waypoint({ arsenic_level_ppb: 5 }),
      waypoint({ arsenic_level_ppb: 10 }),
      waypoint({ arsenic_level_ppb: 30 }),
      waypoint({ created_at: '2026-09-24T12:00:00.000Z', arsenic_level_ppb: 500 }),
    ], now)

    expect(counts).toEqual({ critical: 1, watch: 2, normal: 1, total: 4 })
  })

  it('exports only public waypoint fields and escapes CSV values', () => {
    const csv = createPublicWaypointsCsv([waypoint({ sample_code: 'KOK,"1"' })])

    expect(csv).toContain('"sample_code","arsenic_level_ppb","latitude","longitude","gps_accuracy_meters","created_at"')
    expect(csv).toContain('"KOK,""1"""')
    expect(csv).not.toContain('full_name')
    expect(csv).not.toContain('phone_number')
    expect(csv).not.toContain('photo_1_path')
  })
})
