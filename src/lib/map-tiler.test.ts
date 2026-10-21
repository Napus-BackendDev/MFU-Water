import { describe, expect, it } from 'vitest'
import { satelliteTileConfig } from './map-tiler'

describe('satelliteTileConfig', () => {
  it('uses MapTiler raster imagery and encodes its public key when configured', () => {
    expect(satelliteTileConfig(' public key ')).toMatchObject({
      url: 'https://api.maptiler.com/maps/satellite-v4/{z}/{x}/{y}.jpg?key=public%20key',
      maxZoom: 20,
      maxNativeZoom: 20,
      tileSize: 512,
      zoomOffset: -1,
      provider: 'MapTiler',
    })
    expect(satelliteTileConfig('public key').attribution).toContain('© MapTiler')
  })

  it('uses Esri World Imagery when no MapTiler key is configured', () => {
    expect(satelliteTileConfig('')).toMatchObject({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      maxZoom: 20,
      maxNativeZoom: 19,
      provider: 'Esri',
    })
    expect(satelliteTileConfig('').attribution).toContain('Source: Esri')
  })
})
