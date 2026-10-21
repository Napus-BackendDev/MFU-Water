export type EvacuationPoint = { id: string; kind: 'elderly' | 'disability' | 'children' | 'children_elderly'; latitude: number; longitude: number }
export type RestrictedEvacuation = { visibility: 'restricted'; routeAlignment: string | null; points: EvacuationPoint[]; routes: Array<Array<[number, number]>> }
