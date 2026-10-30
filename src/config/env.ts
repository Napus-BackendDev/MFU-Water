type PublicEnv = {
  VITE_MAPTILER_API_KEY?: string
  VITE_TURNSTILE_SITE_KEY?: string
}

function getDefaultPublicEnv(): PublicEnv {
  const nuxtPublic = typeof window !== 'undefined' ? (window as any).__NUXT__?.config?.public : null
  return {
    VITE_MAPTILER_API_KEY: nuxtPublic?.mapTilerApiKey || import.meta.env?.VITE_MAPTILER_API_KEY,
    VITE_TURNSTILE_SITE_KEY: nuxtPublic?.turnstileSiteKey || import.meta.env?.VITE_TURNSTILE_SITE_KEY,
  }
}

export function readPublicEnv(env: PublicEnv = getDefaultPublicEnv()) {
  return {
    mapTilerApiKey: env.VITE_MAPTILER_API_KEY?.trim() ?? '',
    turnstileSiteKey: env.VITE_TURNSTILE_SITE_KEY?.trim() ?? '',
  }
}

const publicEnv = readPublicEnv()

export const mapTilerApiKey = publicEnv.mapTilerApiKey
export const turnstileSiteKey = publicEnv.turnstileSiteKey
export const turnstileEnabled = import.meta.env.VITE_TURNSTILE_ENABLED === 'true'
