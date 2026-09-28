// Only accept the publication-checked Express image route, never a Storage URL.
export function evidencePhotos(sample) {
  if (!sample?.sample_code) return [];
  const prefix = `/api/samples/${encodeURIComponent(sample.sample_code)}/photos/`;
  return (Array.isArray(sample.images) ? sample.images : []).filter(image =>
    typeof image?.url === 'string' && image.url.startsWith(prefix)
    && /^\d+$/.test(image.url.slice(prefix.length)));
}
