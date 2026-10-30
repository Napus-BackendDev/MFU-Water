const tokenKey = 'kok_admin_token'
const reviewerKey = 'kok_admin_reviewer'

function read(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  if (typeof window === 'undefined') return
  try {
    if (value) sessionStorage.setItem(key, value)
    else sessionStorage.removeItem(key)
  } catch {
    // Storage can be blocked; the session then lasts only for this page view.
  }
}

export const getAdminToken = () => read(tokenKey)
export const setAdminToken = (token: string | null) => write(tokenKey, token)
export const getReviewerName = () => read(reviewerKey) ?? ''
export const setReviewerName = (name: string) => write(reviewerKey, name.trim().slice(0, 80) || null)

// Private photos need the admin token, which an <img src> cannot send, so fetch them and hand back an object URL.
export async function fetchAdminPhoto(path: string): Promise<string | null> {
  const token = getAdminToken()
  try {
    const response = await fetch(`/api/admin/photo?path=${encodeURIComponent(path)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    return response.ok ? URL.createObjectURL(await response.blob()) : null
  } catch {
    return null
  }
}

// Local development: the server unlocks the admin pages without a passcode. Production answers 400/401, so this returns false there.
export async function requestAdminBypass(): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/verify-passcode', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ passcode: '' }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || !data?.bypass || typeof data.token !== 'string') return false
    setAdminToken(data.token)
    return true
  } catch {
    return false
  }
}
