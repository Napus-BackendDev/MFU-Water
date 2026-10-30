import { describe, expect, it } from 'vitest'
import { readPublicEnv } from './env'

describe('readPublicEnv', () => {
  it('returns empty browser-safe settings when nothing is configured', () => {
    expect(readPublicEnv({})).toEqual({ mapTilerApiKey: '', turnstileSiteKey: '' })
  })

  it('trims the public MapTiler and Turnstile site keys', () => {
    expect(readPublicEnv({ VITE_MAPTILER_API_KEY: ' maptiler-public-key ', VITE_TURNSTILE_SITE_KEY: ' site-key ' })).toEqual({
      mapTilerApiKey: 'maptiler-public-key',
      turnstileSiteKey: 'site-key',
    })
  })
})
