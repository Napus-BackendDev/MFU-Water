import type { SurveyWaypoint } from './survey'

export type SurveyWaypointCluster = {
  id: string
  latitude: number
  longitude: number
  sampleCount: number
  latest: SurveyWaypoint
  minPpb: number
  maxPpb: number
  averagePpb: number
}

const clusterRadiusMeters = 250

function distanceMeters(a: SurveyWaypoint, b: SurveyWaypoint) {
  const radians = Math.PI / 180
  const latitudeDelta = (b.latitude - a.latitude) * radians
  const longitudeDelta = (b.longitude - a.longitude) * radians
  const meanLatitude = ((a.latitude + b.latitude) / 2) * radians
  return 6_371_000 * Math.hypot(latitudeDelta, Math.cos(meanLatitude) * longitudeDelta)
}

export function clusterSurveyWaypoints(points: SurveyWaypoint[]): SurveyWaypointCluster[] {
  const ordered = [...points].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
  const visited = new Set<string>()
  const clusters: SurveyWaypointCluster[] = []

  for (const anchor of ordered) {
    if (visited.has(anchor.id)) continue
    const members = ordered.filter((point) => !visited.has(point.id) && distanceMeters(anchor, point) <= clusterRadiusMeters)
    members.forEach((point) => visited.add(point.id))
    const levels = members.map((point) => point.arsenic_level_ppb)
    clusters.push({
      id: anchor.id,
      latitude: members.reduce((total, point) => total + point.latitude, 0) / members.length,
      longitude: members.reduce((total, point) => total + point.longitude, 0) / members.length,
      sampleCount: members.length,
      latest: anchor,
      minPpb: Math.min(...levels),
      maxPpb: Math.max(...levels),
      averagePpb: levels.reduce((total, level) => total + level, 0) / levels.length,
    })
  }

  return clusters
}
