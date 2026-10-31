type Place = { id: string; center: [number, number] }

const EARTH_RADIUS_KM = 6371

function distanceKm([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]) {
  const rad = Math.PI / 180
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2
    + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

// Survey points carry no community field. A point belongs to the community whose centre is within maxKm,
// or to none when it lies outside every village.
export function communityOfPoint<T extends Place>(
  latitude: number,
  longitude: number,
  places: readonly T[],
  maxKm = 10,
): T | undefined {
  let best: T | undefined
  let bestKm = maxKm
  for (const place of places) {
    const km = distanceKm([latitude, longitude], place.center)
    if (km <= bestKm) { best = place; bestKm = km }
  }
  return best
}
