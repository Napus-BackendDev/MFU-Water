import kokRiver from '../../data/kokRiverAccurate.json' with { type: 'json' };

export const RIVER_COORDINATES = kokRiver.features[0].geometry.coordinates;

export const RIVER_BOUNDS = RIVER_COORDINATES.reduce(
  (bounds, [lng, lat]) => [
    [Math.min(bounds[0][0], lng), Math.min(bounds[0][1], lat)],
    [Math.max(bounds[1][0], lng), Math.max(bounds[1][1], lat)]
  ],
  [[Infinity, Infinity], [-Infinity, -Infinity]]
);

// 90 seconds cycle: provides a calm, very slow, and realistic water flow animation
export const RIVER_FLOW_CYCLE_DURATION_MS = 90000;

// Distance-weighted playback keeps the visual pulse moving uniformly along the mapped channel.
const distances = [0];
for (let i = 1; i < RIVER_COORDINATES.length; i += 1) {
  const [previousLng, previousLat] = RIVER_COORDINATES[i - 1];
  const [lng, lat] = RIVER_COORDINATES[i];
  const meanLat = ((previousLat + lat) / 2) * Math.PI / 180;
  const dx = (lng - previousLng) * Math.cos(meanLat);
  const dy = lat - previousLat;
  distances.push(distances[i - 1] + Math.hypot(dx, dy));
}
const totalDistance = distances[distances.length - 1];

export function riverPointAt(progress) {
  if (progress <= 0) return RIVER_COORDINATES[0];
  if (progress >= 1) return RIVER_COORDINATES[RIVER_COORDINATES.length - 1];

  const target = progress * totalDistance;
  let low = 1;
  let high = distances.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (distances[middle] < target) low = middle + 1;
    else high = middle;
  }
  const fraction = (target - distances[low - 1]) / (distances[low] - distances[low - 1] || 1);
  const start = RIVER_COORDINATES[low - 1];
  const end = RIVER_COORDINATES[low];
  return [start[0] + (end[0] - start[0]) * fraction, start[1] + (end[1] - start[1]) * fraction];
}
