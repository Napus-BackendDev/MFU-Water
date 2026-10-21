export type EvacuationPoint = { id: string; kind: 'elderly' | 'disability' | 'children' | 'children_elderly'; latitude: number; longitude: number }
export type PublicEvacuation = { visibility: 'public'; routeAlignment: string | null; points: EvacuationPoint[]; routes: Array<Array<[number, number]>> }
let pending: Promise<PublicEvacuation> | null = null
export function loadPublicEvacuation() {
  pending ??= fetch('/evacuation/thaton.json').then(async (response) => {
    if (!response.ok) throw new Error('Evacuation data unavailable')
    const data = await response.json() as PublicEvacuation
    if (data.visibility !== 'public' || !Array.isArray(data.points) || !Array.isArray(data.routes)) throw new Error('Invalid evacuation data')
    return data
  }).catch((error) => { pending = null; throw error })
  return pending
}
