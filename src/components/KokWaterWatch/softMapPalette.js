// Keep the provider paint values so imagery modes retain their original colours.
// Scope by source, not just layer type: survey and administrative overlays coexist.
const originalPaint = new WeakMap();
const originalNaturalVisibility = new WeakMap();

// Natural vector overlays belong on the street map, not on satellite imagery.
export function applyNaturalFeatureVisibility(map, mapType) {
  let originals = originalNaturalVisibility.get(map);
  if (!originals) {
    originals = new Map();
    originalNaturalVisibility.set(map, originals);
  }
  for (const layer of map.getStyle().layers || []) {
    if (layer.source !== 'versatiles-shortbread' || !/^(land-|water-)/.test(layer.id)) continue;
    if (!originals.has(layer.id)) originals.set(layer.id, layer.layout?.visibility || 'visible');
    map.setLayoutProperty(layer.id, 'visibility', mapType === 'street' ? originals.get(layer.id) : 'none');
  }
}

export function applySoftMapPalette(map, mapType = 'street') {
  let originals = originalPaint.get(map);
  if (!originals) {
    originals = new Map();
    originalPaint.set(map, originals);
  }
  for (const layer of map.getStyle().layers || []) {
    const { id, type } = layer;
    if (layer.source !== 'versatiles-shortbread' && id !== 'background') continue;
    if (id.startsWith('boundary-')) continue;
    const property = type === 'background' ? 'background-color'
      : type === 'fill' ? 'fill-color' : type === 'line' ? 'line-color' : null;
    if (!property) continue;
    if (!originals.has(id)) originals.set(id, layer.paint?.[property] ?? null);
    if (mapType !== 'street') {
      map.setPaintProperty(id, property, originals.get(id));
      continue;
    }
    if (type === 'background') {
      map.setPaintProperty(id, 'background-color', '#f8f9f6');
    } else if (type === 'fill') {
      let color = '#f0f1ed';
      if (id.startsWith('water-')) color = '#e0edf4';
      else if (/^land-(forest|park|garden|vegetation|wetland)/.test(id)) color = '#e2ecdd';
      else if (/^land-(grass|leisure|burial)/.test(id)) color = '#edf3e7';
      else if (/^land-(agriculture|sand)/.test(id)) color = '#f4f2e9';
      else if (id === 'land-glacier') color = '#f0f6f7';
      else if (id.startsWith('building')) color = '#e8ece8';
      map.setPaintProperty(id, 'fill-color', color);
    } else if (type === 'line' && !id.startsWith('boundary-')) {
      const color = id.startsWith('water-') || id === 'transport-ferry'
        ? '#bdd6e3'
        : id.includes(':outline') ? '#f8f9f6'
          : /primary|secondary|trunk|motorway/.test(id) ? '#e8e0cf' : '#dde1dc';
      map.setPaintProperty(id, 'line-color', color);
    }
  }
}
