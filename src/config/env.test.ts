import { describe, expect, it } from 'vitest'
import { readPublicEnv } from './env'

describe('readPublicEnv', () => {
  it('trims local-only browser-safe Supabase settings', () => {
    expect(readPublicEnv({
      VITE_SUPABASE_URL: ' http://127.0.0.1:54321 ',
      VITE_SUPABASE_ANON_KEY: ' local-anon ',
    })).toEqual({
      supabaseUrl: 'http://127.0.0.1:54321',
      supabaseAnonKey: 'local-anon',
      mapTilerApiKey: '',
      turnstileSiteKey: '',
    })
  })

  it('trims the public MapTiler key independently of local Supabase configuration', () => {
    expect(readPublicEnv({ VITE_MAPTILER_API_KEY: ' maptiler-public-key ' })).toMatchObject({
      supabaseUrl: '',
      supabaseAnonKey: '',
      mapTilerApiKey: 'maptiler-public-key',
      turnstileSiteKey: '',
    })
  })

  it('fails closed for hosted Supabase targets', () => {
    expect(readPublicEnv({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: ' hosted-anon ',
    }, false)).toEqual({ supabaseUrl: '', supabaseAnonKey: '', mapTilerApiKey: '', turnstileSiteKey: '' })
  })

  it('rejects malformed and non-HTTP local targets', () => {
    expect(readPublicEnv({ VITE_SUPABASE_URL: 'not-a-url', VITE_SUPABASE_ANON_KEY: 'key' })).toEqual({
      supabaseUrl: '',
      supabaseAnonKey: '',
      mapTilerApiKey: '',
      turnstileSiteKey: '',
    })
    expect(readPublicEnv({ VITE_SUPABASE_URL: 'https://localhost:54321', VITE_SUPABASE_ANON_KEY: 'key' })).toEqual({
      supabaseUrl: '',
      supabaseAnonKey: '',
      mapTilerApiKey: '',
      turnstileSiteKey: '',
    })
  })

  it('allows a hosted Supabase project only for an explicit production build', () => {
    expect(readPublicEnv({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'hosted-anon',
    }, true)).toMatchObject({ supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'hosted-anon' })
  })
})
