import { describe, expect, it } from 'vitest'
import type { SurveyWaypoint } from './survey'

function filterWaypointsByTime(
  waypoints: SurveyWaypoint[],
  timeRange: 'today' | '24h' | '7d' | '30d' | 'all',
  referenceNow = Date.now(),
): SurveyWaypoint[] {
  if (timeRange === 'all') return waypoints
  return waypoints.filter((wp) => {
    const rawDate = wp.collection_time || wp.created_at
    const createdMs = Date.parse(rawDate)
    if (!Number.isFinite(createdMs)) return false
    const ageHours = (referenceNow - createdMs) / (1000 * 3600)
    if ((timeRange === 'today' || timeRange === '24h') && ageHours > 24) return false
    if (timeRange === '7d' && ageHours > 24 * 7) return false
    if (timeRange === '30d' && ageHours > 24 * 30) return false
    return true
  })
}

describe('filterWaypointsByTime for Chemical Timeline', () => {
  const baseTime = Date.parse('2026-10-31T12:00:00.000Z')

  const sampleToday: SurveyWaypoint = {
    id: 'wp-today',
    sample_code: 'DEMO-TODAY',
    arsenic_level_ppb: 10,
    latitude: 20.05,
    longitude: 99.36,
    gps_accuracy_meters: 5,
    created_at: new Date(baseTime - 4 * 3600 * 1000).toISOString(), // 4 hours ago
  }

  const sample3DaysAgo: SurveyWaypoint = {
    id: 'wp-3d',
    sample_code: 'DEMO-3D',
    arsenic_level_ppb: 20,
    latitude: 20.06,
    longitude: 99.37,
    gps_accuracy_meters: 5,
    created_at: new Date(baseTime - 3 * 24 * 3600 * 1000).toISOString(), // 3 days ago
  }

  const sample15DaysAgo: SurveyWaypoint = {
    id: 'wp-15d',
    sample_code: 'DEMO-15D',
    arsenic_level_ppb: 5,
    latitude: 20.07,
    longitude: 99.38,
    gps_accuracy_meters: 5,
    created_at: new Date(baseTime - 15 * 24 * 3600 * 1000).toISOString(), // 15 days ago
  }

  const sample45DaysAgo: SurveyWaypoint = {
    id: 'wp-45d',
    sample_code: 'DEMO-45D',
    arsenic_level_ppb: 0,
    latitude: 20.08,
    longitude: 99.39,
    gps_accuracy_meters: 5,
    created_at: new Date(baseTime - 45 * 24 * 3600 * 1000).toISOString(), // 45 days ago
  }

  const allSamples = [sampleToday, sample3DaysAgo, sample15DaysAgo, sample45DaysAgo]

  it('filters waypoints for "today" (<= 24 hours)', () => {
    const res = filterWaypointsByTime(allSamples, 'today', baseTime)
    expect(res.map((w) => w.id)).toEqual(['wp-today'])
  })

  it('filters waypoints for "7d" (<= 7 days)', () => {
    const res = filterWaypointsByTime(allSamples, '7d', baseTime)
    expect(res.map((w) => w.id)).toEqual(['wp-today', 'wp-3d'])
  })

  it('filters waypoints for "30d" (<= 30 days)', () => {
    const res = filterWaypointsByTime(allSamples, '30d', baseTime)
    expect(res.map((w) => w.id)).toEqual(['wp-today', 'wp-3d', 'wp-15d'])
  })

  it('returns all waypoints for "all"', () => {
    const res = filterWaypointsByTime(allSamples, 'all', baseTime)
    expect(res).toHaveLength(4)
  })
})
