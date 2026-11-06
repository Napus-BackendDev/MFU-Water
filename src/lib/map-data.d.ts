export type CommunityId = 'thaton' | 'ruammit' | 'pongkhong' | 'pakingtai'
export type PublishStatus = 'draft' | 'published'

export type LevelDef = { key: string; label: string; color: string }
export type ValidationError = { field: string; message: string }
export type Validation<T> = { ok: true; value: T } | { ok: false; errors: ValidationError[] }

export type Answers = Record<string, string | number>
export type Household = {
  id: string
  seq: number
  community_id: CommunityId
  latitude: number
  longitude: number
  hamlet_id: string | null
  answers: Answers
  published: boolean
  updated_at?: string
  updated_by?: string | null
}

export type Hamlet = {
  id: string
  community_id: CommunityId
  name: string
  aliases: string[]
  center: { latitude: number; longitude: number } | null
  note: string
  status: PublishStatus
  updated_at?: string
  updated_by?: string | null
}

export type PlaceKind =
  | 'shelter' | 'assembly' | 'vehicle_point' | 'health_center' | 'temple' | 'school' | 'community_hall'
  | 'local_admin' | 'water_supply' | 'pier' | 'kitchen' | 'coordination_point' | 'other'
export type PlacePrecision = 'approximate' | 'field_verified'
export type PlaceOperational = 'unchecked' | 'ready' | 'closed'

export type Place = {
  id: string
  community_id: CommunityId
  kind: PlaceKind
  name: string
  source_section: string
  latitude: number | null
  longitude: number | null
  location_precision: PlacePrecision | null
  operational_status: PlaceOperational
  capacity_planned: number | null
  capacity_available: number | null
  last_checked: string | null
  note: string
  status: PublishStatus
  verified_at?: string | null
  updated_at?: string
  updated_by?: string | null
}

export type PublicPlace = {
  id: string
  communityId: CommunityId
  kind: PlaceKind
  kindLabel: string
  name: string
  latitude: number | null
  longitude: number | null
  color: string
  evacuationColor: string
  path: string
  sourceSection: string
  precisionLabel: string
  operationalLabel: string
  capacityLabel: string
  note: string
}

export type PublicHamlet = { id: string; name: string; note: string; center: Hamlet['center']; households: number | null; householdsLabel: string }

export type ReviewRecord = { id: string; latitude: number; longitude: number; status: string; color: string; fields: Record<string, string> }
export type ReviewLayer = { id: string; label: string; rowCount: number; records: ReviewRecord[]; legend: Array<{ label: string; color: string; rows: number }> }
export type CommunityReview = {
  visibility: 'public'
  sourceUrl: string
  title: string
  surveyDate: string | null
  importedAt: string
  sourceRowsPerLayer: number
  distinctCoordinates: number
  pointsPublic: boolean
  layers: ReviewLayer[]
}
export type CommunityMeta = { sourceUrl: string; title: string; importedAt: string; surveyDate: string | null }

export type Routes = { routes: Array<Array<[number, number]>>; alignment: string; source: string }
export type CommunityProfileDoc = { community_id: CommunityId; title: string; basin: string; people: string; livelihood: string; risk: string }

export type CommunityLayer = { id: string; label: string; fields: string[]; level(answers: Answers): string }

export const COMMUNITY_IDS: CommunityId[]
export const ZONE_FIELD: string
export const MEMBERS_FIELD: string
export const UNKNOWN_ANSWER: string
export const PUBLISH_STATUSES: PublishStatus[]
export const HAMLET_K_THRESHOLD: number
export const PROFILE_FIELDS: string[]
export const FIELD_OPTIONS: Record<string, string[]>
export const LEVEL_DEFS: Record<string, LevelDef[]>
export const COMMUNITY_LAYERS: CommunityLayer[]
export const PLACE_KINDS: Record<PlaceKind, { label: string; color: string; evacuationColor?: string; path: string }>
export const PLACE_PRECISIONS: Record<PlacePrecision, string>
export const PLACE_OPERATIONAL: Record<PlaceOperational, string>
export const EVACUATION_DESTINATION_KINDS: PlaceKind[]

export function layerById(layerId: string): CommunityLayer | undefined
export function classifyLayer(layer: CommunityLayer, answers: Answers): LevelDef
export function classifyHousehold(answers: Answers): Record<string, LevelDef>
export function householdIdOf(seq: number): string
export function recordIdOf(layerIndex: number, seq: number): string
export function seqOfHouseholdId(id: string): number | null
export function hamletNameOf(household: Pick<Household, 'hamlet_id'>, hamletById: Map<string, Hamlet>): string
export function buildCommunityReview(input: {
  households: Household[]
  hamlets?: Hamlet[]
  meta?: Partial<CommunityMeta>
  hiddenLayers?: string[]
  pointsPublic?: boolean
}): CommunityReview
export function seedFromReview(review: unknown, options?: { communityId?: CommunityId }): { hamlets: Hamlet[]; households: Household[] }
export function metaFromReview(review: unknown): CommunityMeta
export function levelGroups(households: Household[], layerId?: string): Array<LevelDef & { count: number }>
export function isThaiCoordinate(latitude: number, longitude: number): boolean
export function householdFields(): Array<{ key: string; options: string[]; required: boolean }>
export function validateHousehold(input: Record<string, unknown>, options?: { hamletIds?: Set<string>; partial?: boolean }): Validation<Partial<Household>>
export function suggestHamletMerges(hamlets: Hamlet[]): Array<{ ids: string[]; names: string[] }>
export function findHamletByName(name: string, hamlets: Hamlet[]): Hamlet | null
export function validateHamlet(input: Record<string, unknown>, options?: { others?: Hamlet[] }): Validation<Omit<Hamlet, 'id'>>
export function hamletCounts(households: Household[], hamlets: Hamlet[]): { counts: Map<string, number>; unassigned: number }
export function publicHamletSummary(households: Household[], hamlets: Hamlet[], k?: number): PublicHamlet[]
export function validatePlace(input: Record<string, unknown>): Validation<Omit<Place, 'id'>>
export function toPublicPlace(place: Place): PublicPlace
export function publicPlaces(places: Place[]): { placed: PublicPlace[]; pending: PublicPlace[] }
export function evacuationDestinations(places: Place[]): Array<{ id: string; kind: PlaceKind; label: string; latitude: number; longitude: number }>
export function validateRoutes(input: Record<string, unknown>): Validation<Routes>
export function validateProfile(input: Record<string, unknown>): Validation<CommunityProfileDoc>
export function changedKeys(before: Record<string, unknown> | null | undefined, after: Record<string, unknown>): string[]
