import floodHistory from '../../data/public-flood-history.json'
import evacuationReference from '../../data/public-evacuation-reference.json'

export type CommunityMapType = 'hamlets' | 'flood' | 'places' | 'evacuation'
export const publicFloodHistory = floodHistory
export const publicEvacuationReference = evacuationReference

export function hasPublicMapLayer(communityId: string, type: CommunityMapType) {
  const isAvailable = communityId === 'thaton' || communityId === 'all'
  return isAvailable && (
    (type === 'flood' && floodHistory.features.length > 0) ||
    (type === 'evacuation' && evacuationReference.points.length > 0)
  )
}
