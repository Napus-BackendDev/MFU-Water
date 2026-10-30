import { sampleFloodGrid, floodDepthAtPoint, type FloodGrid } from './flood-simulation'
import type { EvacuationPoint } from './public-evacuation'

// Reuses the vulnerability+flood severity colour scale already defined for
// My Maps layer-1 (public/mymaps/thaton.json) instead of inventing a new palette.
export const priorityTiers = [
  { id: 'critical', label: 'วิกฤต · อพยพทันที', minScore: 9, color: '#A52714' },
  { id: 'urgent', label: 'เร่งด่วน', minScore: 5, color: '#E65100' },
  { id: 'watch', label: 'เฝ้าระวัง', minScore: 2, color: '#F9A825' },
  { id: 'safe', label: 'ปลอดภัย', minScore: 0, color: '#0F9D58' },
] as const

const vulnerabilityWeight: Record<EvacuationPoint['kind'], number> = {
  children_elderly: 4,
  disability: 4,
  elderly: 3,
  children: 2,
}

export type EvacuationPriority = {
  point: EvacuationPoint
  depthMetres: number | null
  score: number
  tier: (typeof priorityTiers)[number]
}

export function rankEvacuationPriority(points: EvacuationPoint[], grid: FloodGrid, riseMetres: number): EvacuationPriority[] {
  const ranked: EvacuationPriority[] = []
  for (const point of points) {
    const sample = sampleFloodGrid(grid, point.latitude, point.longitude)
    const depth = floodDepthAtPoint(sample, riseMetres)
    if (depth == null) continue
    const depthWeight = depth === 0 ? 0 : depth < 0.5 ? 1 : depth < 1 ? 2 : 3
    const score = depthWeight * vulnerabilityWeight[point.kind]
    const tier = priorityTiers.find((item) => score >= item.minScore)!
    ranked.push({ point, depthMetres: depth, score, tier })
  }
  return ranked.sort((a, b) => b.score - a.score || a.point.id.localeCompare(b.point.id))
}
