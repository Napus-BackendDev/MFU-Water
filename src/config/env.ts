type PublicEnv = {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
  VITE_MAPTILER_API_KEY?: string
  VITE_TURNSTILE_SITE_KEY?: string
}

export function readPublicEnv(env: PublicEnv = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_MAPTILER_API_KEY: import.meta.env.VITE_MAPTILER_API_KEY,
  VITE_TURNSTILE_SITE_KEY: import.meta.env.VITE_TURNSTILE_SITE_KEY,
}, allowHosted = import.meta.env.PROD || import.meta.env.VITE_ALLOW_HOSTED_SUPABASE === 'true') {
  const configuredUrl = env.VITE_SUPABASE_URL?.trim() ?? ''
  let supabaseUrl = ''
  try {
    const parsedUrl = new URL(configuredUrl)
    if (parsedUrl.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsedUrl.hostname)) {
      supabaseUrl = parsedUrl.origin
    } else if (allowHosted && parsedUrl.protocol === 'https:' && parsedUrl.hostname.endsWith('.supabase.co')) {
      supabaseUrl = parsedUrl.origin
    }
  } catch {
    // Invalid targets stay disabled; hosted targets require explicit opt-in or production.
  }

  return {
    supabaseUrl,
    supabaseAnonKey: supabaseUrl ? env.VITE_SUPABASE_ANON_KEY?.trim() ?? '' : '',
    mapTilerApiKey: env.VITE_MAPTILER_API_KEY?.trim() ?? '',
    turnstileSiteKey: env.VITE_TURNSTILE_SITE_KEY?.trim() ?? '',
  }
}

const publicEnv = readPublicEnv()

export const isSupabaseConfigured = Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey)
export const mapTilerApiKey = publicEnv.mapTilerApiKey
export const turnstileSiteKey = publicEnv.turnstileSiteKey
export const turnstileEnabled = import.meta.env.VITE_TURNSTILE_ENABLED === 'true'
