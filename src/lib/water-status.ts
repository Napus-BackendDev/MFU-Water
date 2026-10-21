import type { SurveyWaypoint } from './survey'

export type WaterStatusCounts = {
  critical: number
  watch: number
  normal: number
  total: number
}

export function countTodaysWaterStatuses(waypoints: SurveyWaypoint[], now = new Date()): WaterStatusCounts {
  const day = now.toDateString()
  const counts: WaterStatusCounts = { critical: 0, watch: 0, normal: 0, total: 0 }
  for (const waypoint of waypoints) {
    const createdAt = new Date(waypoint.created_at)
    if (!Number.isFinite(createdAt.getTime()) || createdAt.toDateString() !== day) continue
    if (waypoint.arsenic_level_ppb > 10) counts.critical += 1
    else if (waypoint.arsenic_level_ppb >= 5) counts.watch += 1
    else counts.normal += 1
    counts.total += 1
  }
  return counts
}

export function createPublicWaypointsCsv(waypoints: SurveyWaypoint[]): string {
  const rows: unknown[][] = [
    ['sample_code', 'arsenic_level_ppb', 'latitude', 'longitude', 'gps_accuracy_meters', 'created_at'],
    ...waypoints.map((waypoint) => [
      waypoint.sample_code,
      waypoint.arsenic_level_ppb,
      waypoint.latitude,
      waypoint.longitude,
      waypoint.gps_accuracy_meters ?? '',
      waypoint.created_at,
    ]),
  ]

  return `\uFEFF${rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n')}`
}
