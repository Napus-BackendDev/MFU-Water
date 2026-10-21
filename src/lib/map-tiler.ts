export type SatelliteTileConfig = {
  url: string
  attribution: string
  maxZoom: number
  maxNativeZoom: number
  tileSize?: number
  zoomOffset?: number
  provider: 'MapTiler' | 'Esri'
}

const esriImageryAttribution = '<a href="https://www.esri.com/" target="_blank" rel="noreferrer">Source: Esri</a>, Vantor, Earthstar Geographics, and the GIS User Community'

export function satelliteTileConfig(apiKey: string): SatelliteTileConfig {
  const key = apiKey.trim()
  if (!key) {
    return {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: esriImageryAttribution,
      maxZoom: 20,
      maxNativeZoom: 19,
      provider: 'Esri',
    }
  }

  return {
    url: `https://api.maptiler.com/maps/satellite-v4/{z}/{x}/{y}.jpg?key=${encodeURIComponent(key)}`,
    attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer">© MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>',
    maxZoom: 20,
    maxNativeZoom: 20,
    tileSize: 512,
    zoomOffset: -1,
    provider: 'MapTiler',
  }
}
