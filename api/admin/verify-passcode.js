import { clientIp, respond } from '../surveys/_shared.js'
import { loginAdminCredentials } from './_admin_shared.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return respond(response, 405, { error: 'Method not allowed' })
  }
  let body
  try {
    body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body
  } catch {
    return respond(response, 400, { error: 'คำขอไม่ถูกต้อง' })
  }
  try {
    const { status, body: payload } = await loginAdminCredentials({
      username: body?.username,
      password: body?.password,
      passcode: body?.passcode,
      clientIp: clientIp(request),
    })
    return respond(response, status, payload)
  } catch (error) {
    console.error('ADMIN LOGIN ERROR:', error?.message)
    return respond(response, 503, { error: 'ไม่สามารถเชื่อมต่อฐานข้อมูลผู้ใช้งานได้ในขณะนี้' })
  }
}
