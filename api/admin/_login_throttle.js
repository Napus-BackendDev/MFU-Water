import { createHash } from 'node:crypto'
import { getDb } from '../surveys/_db.js'
import { config } from '../surveys/_shared.js'

// Admin login brute-force guard: after MAX_FAILURES wrong tries from one address on one account,
// that pair is locked for LOCK_MS. Counts live in the database so every serverless instance shares them.
export const MAX_FAILURES = 5
export const LOCK_MS = 15 * 60 * 1000
const COLLECTION = 'kok_admin_login_failures'

export const throttleKey = (ip, who) => createHash('sha256').update(`${ip}|${String(who || 'passcode').toLowerCase()}`).digest('hex').slice(0, 32)

const collection = async () => (await getDb(config(false))).collection(COLLECTION)

// Resolves { locked: false } or { locked: true, retryAfterSeconds }. A database problem never blocks a real login.
export async function checkLoginLock(key, now = Date.now()) {
  try {
    const doc = await (await collection()).findOne({ key })
    if (doc?.locked_until && doc.locked_until > now) return { locked: true, retryAfterSeconds: Math.ceil((doc.locked_until - now) / 1000) }
  } catch { /* fail open on storage errors so admins are not locked out by an outage */ }
  return { locked: false }
}

export async function recordLoginFailure(key, now = Date.now()) {
  try {
    const coll = await collection()
    const doc = await coll.findOne({ key })
    const fresh = !doc || now - (doc.first_at ?? 0) > LOCK_MS
    const count = fresh ? 1 : doc.count + 1
    await coll.updateOne({ key }, { $set: { count, first_at: fresh ? now : doc.first_at, locked_until: count >= MAX_FAILURES ? now + LOCK_MS : 0 } }, { upsert: true })
  } catch { /* see above */ }
}

export async function clearLoginFailures(key) {
  try { await (await collection()).deleteOne({ key }) } catch { /* see above */ }
}
