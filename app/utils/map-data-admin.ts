import { getAdminToken, getReviewerName } from './admin-session'
import type {
  CommunityId,
  CommunityProfileDoc,
  CommunityReview,
  Hamlet,
  Household,
  LevelDef,
  Place,
  PublicHamlet,
  PublicPlace,
  Routes,
  ValidationError,
} from '../../src/lib/map-data'

// ฟังก์ชันเรียก API หลังบ้านของข้อมูลแผนที่ทั้งหมด หน้าแอดมินทุกหน้าใช้ชุดนี้ชุดเดียว
export const sessionExpiredMessage = 'เซสชันแอดมินหมดอายุ กรุณาเข้าสู่ระบบใหม่'

export class MapDataError extends Error {
  status: number
  errors: ValidationError[]
  constructor(message: string, status: number, errors: ValidationError[] = []) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

export type HouseholdRow = Household & { levels: Record<string, LevelDef> }
export type HouseholdPreview = Array<{ layerId: string; label: string; id: string; status: string; color: string; fields: Record<string, string> }>
export type HamletRow = Hamlet & { household_count: number }
export type AuditEntry = { kind: string; id: string; action: string; by: string | null; at: string; changed: string[] }
export type CommunitySettings = { sourceUrl: string; title: string; importedAt: string; surveyDate: string | null; hiddenLayers: string[]; pointsPublic: boolean }
export type LevelGroup = LevelDef & { count: number }

export type MapDataSummary = {
  households: { total: number; published: number; byLevel: LevelGroup[] }
  hamlets: { total: number; unassigned: number }
  places: { total: number; published: number; waitingLocation: number }
  seed: Record<string, string>
  layers: Array<{ id: string; label: string }>
  settings: CommunitySettings
}

export type PreviewPayloads = {
  community: CommunityReview
  places: { placed: PublicPlace[]; pending: PublicPlace[] }
  hamlets: { hamlets: PublicHamlet[] }
  routes: Routes
}

type Query = Record<string, string | number | undefined | null>
const toQuery = (query: Query = {}) => {
  const entries = Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== '')
  return entries.length ? `?${new URLSearchParams(entries.map(([key, value]) => [key, String(value)])).toString()}` : ''
}
const enc = encodeURIComponent

export function createMapDataClient(onSessionExpired?: (message: string) => void) {
  async function call<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
    const token = getAdminToken()
    const reviewer = getReviewerName()
    const response = await fetch(`/api/admin/map-data${path}${toQuery(query)}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(reviewer ? { 'x-admin-name': encodeURIComponent(reviewer) } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (response.status === 401) {
      onSessionExpired?.(sessionExpiredMessage)
      throw new MapDataError(sessionExpiredMessage, 401)
    }
    const data = await response.json().catch(() => null)
    if (!response.ok || !data?.ok) throw new MapDataError(data?.error ?? 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่', response.status, data?.errors)
    return data as T
  }

  return {
    summary: () => call<MapDataSummary & { ok: true }>('GET', ''),
    audit: (limit = 30) => call<{ items: AuditEntry[] }>('GET', '/audit', undefined, { limit }),
    // สิ่งที่หน้าบ้านเห็นจริง (ข้อมูลชุดเดียวกับ API สาธารณะ)
    preview: <K extends keyof PreviewPayloads>(target: K, community?: CommunityId) => call<{ payload: PreviewPayloads[K] }>('GET', `/preview/${target}`, undefined, { community }).then((result) => result.payload),

    settings: {
      get: () => call<{ settings: CommunitySettings; layers: MapDataSummary['layers'] }>('GET', '/settings'),
      save: (value: Partial<Pick<CommunitySettings, 'hiddenLayers' | 'pointsPublic' | 'surveyDate'>>) => call<{ settings: CommunitySettings }>('PUT', '/settings', value),
    },

    places: {
      list: (filters: { kind?: string; status?: string; q?: string; community?: string } = {}) => call<{ items: Place[]; counts: { all: number; published: number; waitingLocation: number } }>('GET', '/places', undefined, filters),
      save: (place: Partial<Place> & { name: string; kind: string }) => (place.id ? call<{ place: Place }>('PUT', `/places/${enc(place.id)}`, place) : call<{ place: Place }>('POST', '/places', place)),
      publish: (id: string, published: boolean) => call<{ place: Place }>('POST', `/places/${enc(id)}/publish`, { published }),
      remove: (id: string) => call<{ id: string }>('DELETE', `/places/${enc(id)}`),
    },

    hamlets: {
      list: () => call<{ items: HamletRow[]; unassigned: number; suggestions: Array<{ ids: string[]; names: string[] }> }>('GET', '/hamlets'),
      save: (hamlet: Partial<Hamlet> & { name: string }) => (hamlet.id ? call<{ hamlet: Hamlet }>('PUT', `/hamlets/${enc(hamlet.id)}`, hamlet) : call<{ hamlet: Hamlet }>('POST', '/hamlets', hamlet)),
      remove: (id: string) => call<{ id: string }>('DELETE', `/hamlets/${enc(id)}`),
      merge: (fromIds: string[], intoId: string) => call<{ moved: number; into: Hamlet }>('POST', '/hamlets/merge', { from_ids: fromIds, into_id: intoId }),
    },

    households: {
      list: (filters: { hamlet?: string; layer?: string; level?: string; q?: string; published?: string; page?: number; pageSize?: number; community?: string } = {}) =>
        call<{ items: HouseholdRow[]; total: number; page: number; pageSize: number; counts: { all: number; hidden: number } }>('GET', '/households', undefined, filters),
      get: (id: string) => call<{ household: HouseholdRow; preview: HouseholdPreview }>('GET', `/households/${enc(id)}`),
      save: (id: string | null, value: Partial<Household>) =>
        id ? call<{ household: HouseholdRow; preview: HouseholdPreview }>('PUT', `/households/${enc(id)}`, value) : call<{ household: HouseholdRow; preview: HouseholdPreview }>('POST', '/households', value),
      publish: (id: string, published: boolean) => call<{ household: HouseholdRow }>('POST', `/households/${enc(id)}/publish`, { published }),
      assign: (ids: string[], hamletId: string | null) => call<{ assigned: number }>('POST', '/households/assign', { ids, hamlet_id: hamletId }),
      remove: (id: string) => call<{ id: string }>('DELETE', `/households/${enc(id)}`),
    },

    evacuation: {
      overview: (community?: string) => call<{ groups: Array<LevelGroup & { inQueue: boolean }>; inQueue: number; routes: Routes; destinations: Place[] }>('GET', '/evacuation', undefined, community ? { community } : {}),
      saveRoute: (routes: Routes['routes'], alignment = 'manual', source = '', community = 'thaton') => call<{ routes: Routes }>('PUT', '/evacuation/route', { routes, alignment, source, community }, { community }),
    },

    profiles: {
      list: () => call<{ items: CommunityProfileDoc[] }>('GET', '/profiles'),
      save: (communityId: CommunityId, profile: Omit<CommunityProfileDoc, 'community_id'>) => call<{ profile: CommunityProfileDoc }>('PUT', `/profiles/${communityId}`, profile),
      reset: (communityId: CommunityId) => call<{ id: string }>('DELETE', `/profiles/${communityId}`),
    },
  }
}

export type MapDataClient = ReturnType<typeof createMapDataClient>
