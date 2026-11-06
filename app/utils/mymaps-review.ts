export type MyMapsRecord = {
  id: string
  latitude: number
  longitude: number
  status: string
  color: string
  fields: Record<string, string>
}

type MyMapsLayer = {
  id: string
  label: string
  rowCount?: number
  records: MyMapsRecord[]
  legend: Array<{ label: string; color: string; rows: number }>
}

export type MyMapsReview = {
  visibility: 'local-review-only' | 'public'
  sourceUrl: string
  title: string
  surveyDate: null | string
  importedAt: string
  sourceRowsPerLayer: number
  distinctCoordinates: number
  pointsPublic?: boolean
  layers: MyMapsLayer[]
}

let pendingMyMaps: Promise<MyMapsReview> | null = null

async function fetchFirstValid(urls: string[]): Promise<MyMapsReview> {
  for (const url of urls) {
    try {
      const response = await (url.startsWith('/local-review') ? fetch(url, { cache: 'no-store', credentials: 'same-origin' }) : fetch(url))
      if (!response.ok) continue
      const data = await response.json()
      if (data && Array.isArray(data.layers) && data.layers.length >= 1) return data as MyMapsReview
    } catch {
      // try the next source
    }
  }
  throw new Error('My Maps data unavailable')
}

export function loadMyMapsData(): Promise<MyMapsReview> {
  // Admin-edited data from the API first (hidden topics make fewer than 6 layers); the static file and the dev endpoint are fallbacks.
  pendingMyMaps ??= fetchFirstValid(['/api/map-data/community', '/mymaps/thaton.json', '/local-review/mymaps'])
    .catch((error) => {
      pendingMyMaps = null
      throw error
    })
  return pendingMyMaps
}
