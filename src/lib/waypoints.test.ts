import { describe, expect, it } from 'vitest'
import { clusterSurveyWaypoints } from './waypoints'
import type { SurveyWaypoint } from './survey'

const waypoint = (id: string, latitude: number, arsenic: number, createdAt: string): SurveyWaypoint => ({
  id,
  sample_code: `KOK-20260925-${id.padStart(4, '0')}`,
  arsenic_level_ppb: arsenic,
  latitude,
  longitude: 99.8912,
  gps_accuracy_meters: null,
  created_at: createdAt,
})

describe('survey waypoint clusters', () => {
  it('groups samples within 250m and summarizes their results', () => {
    const clusters = clusterSurveyWaypoints([
      waypoint('1', 20.0451, 5, '2026-09-25T08:00:00.000Z'),
      waypoint('2', 20.046, 30, '2026-09-25T09:00:00.000Z'),
    ])

    expect(clusters).toHaveLength(1)
    expect(clusters[0]).toMatchObject({ sampleCount: 2, minPpb: 5, maxPpb: 30, averagePpb: 17.5 })
    expect(clusters[0].latest.id).toBe('2')
  })

  it('keeps locations outside 250m separate', () => {
    const clusters = clusterSurveyWaypoints([
      waypoint('1', 20.0451, 5, '2026-09-25T08:00:00.000Z'),
      waypoint('2', 20.05, 30, '2026-09-25T09:00:00.000Z'),
    ])

    expect(clusters).toHaveLength(2)
    expect(clusters.map(({ sampleCount }) => sampleCount)).toEqual([1, 1])
  })
})
