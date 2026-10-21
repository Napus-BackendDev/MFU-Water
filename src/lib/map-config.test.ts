import { describe, expect, it } from 'vitest'
import { parseMapConfig } from './map-config'

describe('parseMapConfig', () => {
  it('accepts a published config row', () => {
    expect(parseMapConfig({
      id: 'id-1',
      slug: 'kok-river',
      name: 'Kok River',
      description: null,
      config: { layer: 'public' },
      is_published: true,
    })).toMatchObject({ slug: 'kok-river', is_published: true })
  })

  it('rejects rows with invalid config shape', () => {
    expect(parseMapConfig({ id: 'id-1', is_published: true })).toBeNull()
    expect(parseMapConfig(null)).toBeNull()
  })
})
