import { respond } from '../surveys/_shared.js'
import { loginAdmin } from './_admin_shared.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return respond(response, 405, { error: 'Method not allowed' })
  }
  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body
    const { status, body: payload } = loginAdmin(body?.passcode)
    return respond(response, status, payload)
  } catch {
    return respond(response, 400, { error: 'คำขอไม่ถูกต้อง' })
  }
}
