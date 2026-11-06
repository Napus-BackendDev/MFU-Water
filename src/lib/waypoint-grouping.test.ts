import { describe, expect, it, vi } from 'vitest'
import type { SurveyWaypoint } from './survey'
import { clusterSurveyWaypoints } from './waypoints'
import { buildChemicalPopup } from '../../app/utils/chemical-popup'

const point = (id: string, ppb: number, lat: number, lon = 99.361, hoursAgo = 0): SurveyWaypoint => ({
  id,
  sample_code: `KOK-TEST-${id}`,
  station_name: `จุดตรวจ ${id}`,
  arsenic_level_ppb: ppb,
  latitude: lat,
  longitude: lon,
  gps_accuracy_meters: 5,
  created_at: new Date(Date.now() - hoursAgo * 3600_000).toISOString(),
  collection_time: new Date(Date.now() - hoursAgo * 3600_000).toISOString(),
  water_source: 'แม่น้ำ',
  rain_context: 'ไม่ทราบ',
  contributor_label: 'ผู้ตรวจ',
  publication_status: 'auto_published',
} as SurveyWaypoint)

describe('one grouping for the map dot and its detail window', () => {
  const points = [
    point('a', 5, 20.0580, 99.3610, 0),
    point('b', 30, 20.0581, 99.3611, 1),
    point('c', 10, 20.0582, 99.3612, 2),
    // ~600 m away: a separate dot on the map
    point('d', 50, 20.0640, 99.3660, 3),
  ]

  it('gives every cluster the members it was counted from', () => {
    const clusters = clusterSurveyWaypoints(points)
    for (const cluster of clusters) {
      expect(cluster.members).toHaveLength(cluster.sampleCount)
      expect(cluster.members.map((member) => member.arsenic_level_ppb)).toContain(cluster.maxPpb)
    }
    expect(clusters.reduce((sum, cluster) => sum + cluster.sampleCount, 0)).toBe(points.length)
  })

  it('puts a point in exactly one cluster, so two dots never show the same rounds', () => {
    const clusters = clusterSurveyWaypoints(points)
    const seen = clusters.flatMap((cluster) => cluster.members.map((member) => member.sample_code))
    expect(new Set(seen).size).toBe(points.length)
    expect(clusters).toHaveLength(2)
  })

  it('shows the same number of rounds in the popup as the cluster holds', () => {
    const cluster = clusterSurveyWaypoints(points)[0]!
    const popup = buildChemicalPopup(cluster, '#000', vi.fn())
    expect(popup.textContent).toContain(`${cluster.sampleCount} ครั้งในบริเวณนี้`)
  })
})
