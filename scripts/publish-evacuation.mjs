import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const kinds = new Set(['elderly', 'disability', 'children', 'children_elderly'])
const coordinate = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && p[0] >= 20 && p[0] <= 20.12 && p[1] >= 99.3 && p[1] <= 99.45

// Publish only the approved map fields; discard source paths and household fields.
export function publicEvacuationPayload(data) {
  if (!data || !Array.isArray(data.points) || !data.points.length || data.points.length > 2000 || !Array.isArray(data.routes) || data.routes.length > 100) throw new Error('Invalid evacuation dataset')
  const points = data.points.map((p, index) => {
    if (!p || !kinds.has(p.kind) || !coordinate([p.latitude, p.longitude])) throw new Error('Invalid evacuation point')
    return { id: `TH-R-${index + 1}`, kind: p.kind, latitude: p.latitude, longitude: p.longitude }
  })
  const routes = data.routes.map((route) => {
    if (!Array.isArray(route) || route.length < 2 || route.length > 10000 || !route.every(coordinate)) throw new Error('Invalid evacuation route')
    return route.map(([lat, lng]) => [lat, lng])
  })
  return { visibility: 'public', source: 'SWG5_ThaTon_Vulnerable_Populations_Evacuation_Map.pdf', verificationStatus: 'approximate_not_field_verified', routeAlignment: data.routeAlignment?.method === 'offline_osm_road_alignment' ? 'offline_osm_road_alignment' : null, points, routes }
}


if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.env.LOCALAPPDATA) throw new Error('LOCALAPPDATA is required')
  const source = join(process.env.LOCALAPPDATA, 'MFUKokWaterWatch/restricted/evacuation-review.json')
  const data = publicEvacuationPayload(JSON.parse(await readFile(source, 'utf8')))
  await mkdir('public/evacuation', { recursive: true })
  await writeFile('public/evacuation/thaton.json', JSON.stringify(data) + '\n')
  console.log(`Published ${data.points.length} map points without names and ${data.routes.length} routes; no names or source household IDs.`)
}
