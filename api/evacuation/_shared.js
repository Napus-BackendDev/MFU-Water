import { createHash, timingSafeEqual } from 'node:crypto'

const kinds = new Set(['elderly', 'disability', 'children', 'children_elderly'])
const coordinate = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && p[0] >= 20 && p[0] <= 20.12 && p[1] >= 99.3 && p[1] <= 99.45

// Only map geometry leaves the server; discard source paths and household fields.
export function evacuationPayload(data) {
  if (!data || !Array.isArray(data.points) || !data.points.length || data.points.length > 2000 || !Array.isArray(data.routes) || data.routes.length > 100) throw new Error('Invalid evacuation dataset')
  const points = data.points.map((p, index) => {
    if (!p || !kinds.has(p.kind) || !coordinate([p.latitude, p.longitude])) throw new Error('Invalid evacuation point')
    return { id: `TH-R-${index + 1}`, kind: p.kind, latitude: p.latitude, longitude: p.longitude }
  })
  const routes = data.routes.map((route) => {
    if (!Array.isArray(route) || route.length < 2 || route.length > 10000 || !route.every(coordinate)) throw new Error('Invalid evacuation route')
    return route.map(([lat, lng]) => [lat, lng])
  })
  return { visibility: 'restricted', routeAlignment: data.routeAlignment?.method === 'offline_osm_road_alignment' ? 'offline_osm_road_alignment' : null, points, routes }
}

export function validAccessKey(authorization, hash) {
  if (!/^[a-f0-9]{64}$/.test(hash ?? '')) return false
  const token = /^Bearer ([a-f0-9]{64})$/.exec(authorization ?? '')?.[1]
  return !!token && timingSafeEqual(createHash('sha256').update(token).digest(), Buffer.from(hash, 'hex'))
}
