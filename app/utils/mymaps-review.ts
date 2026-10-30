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
  layers: MyMapsLayer[]
}

let pendingMyMaps: Promise<MyMapsReview> | null = null

export function loadMyMapsData(): Promise<MyMapsReview> {
  pendingMyMaps ??= fetch('/mymaps/thaton.json')
    .then(async (response) => {
      if (!response.ok) {
        // Fallback to local dev endpoint if available
        const localRes = await fetch('/local-review/mymaps', { cache: 'no-store', credentials: 'same-origin' })
        if (!localRes.ok) throw new Error('My Maps data unavailable')
        return await localRes.json()
      }
      return await response.json()
    })
    .then((data) => {
      if (!data || !Array.isArray(data.layers) || data.layers.length !== 6) {
        throw new Error('Invalid My Maps data')
      }
      return data as MyMapsReview
    })
    .catch((error) => {
      pendingMyMaps = null
      throw error
    })
  return pendingMyMaps
}
