import { createError, getHeader, setHeader, type H3Event } from 'h3'

export function localReviewRoot(event: H3Event) {
  if (!import.meta.dev) throw createError({ statusCode: 404 })
  const host = getHeader(event, 'host') ?? ''
  const remote = event.node.req.socket.remoteAddress ?? ''
  if (!/^(127\.0\.0\.1|localhost):5173$/.test(host)) throw createError({ statusCode: 403, statusMessage: 'Loopback host required' })
  // Nuxt's internal dev proxy may have no socket address; the listener is loopback.
  if (remote && !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote)) throw createError({ statusCode: 403, statusMessage: 'Loopback peer required' })
  if (getHeader(event, 'sec-fetch-site') !== 'same-origin') throw createError({ statusCode: 403, statusMessage: 'Same origin required' })
  setHeader(event, 'Cache-Control', 'no-store, private')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  const root = process.env.LOCALAPPDATA
  if (!root) throw createError({ statusCode: 404 })
  return root
}
