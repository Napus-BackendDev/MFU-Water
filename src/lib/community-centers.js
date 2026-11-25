// Server-side copy of the four villages' centres, used to decide which village a sample belongs to
// when an account is limited to some villages. app/utils/kok-contract.ts holds the same centres for
// the screens; community-centers.test.ts fails if the two ever differ.
export const COMMUNITY_CENTERS = {
  thaton: [20.058, 99.361],
  ruammit: [19.9605, 99.7082],
  pongkhong: [20.3076, 100.2102],
  pakingtai: [20.203878, 100.449169],
}

const EARTH_RADIUS_KM = 6371

function distanceKm([lat1, lon1], [lat2, lon2]) {
  const rad = Math.PI / 180
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2
    + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

// A point belongs to the nearest village centre within maxKm, or to none (undefined).
export function communityIdOfPoint(latitude, longitude, maxKm = 10) {
  let best
  let bestKm = maxKm
  for (const [id, center] of Object.entries(COMMUNITY_CENTERS)) {
    const km = distanceKm([latitude, longitude], center)
    if (km <= bestKm) { best = id; bestKm = km }
  }
  return best
}
