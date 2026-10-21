import { afterEach, describe, expect, it } from 'vitest'
import handler from './status.js'

const responseMock = () => ({
  code: 0,
  payload: undefined,
  headers: {},
  setHeader(name, value) { this.headers[name] = value; return this },
  status(code) { this.code = code; return this },
  json(payload) { this.payload = payload; return this },
})

const originalCredentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
const originalCredentialJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON

afterEach(() => {
  if (originalCredentialPath === undefined) delete process.env.GOOGLE_APPLICATION_CREDENTIALS
  else process.env.GOOGLE_APPLICATION_CREDENTIALS = originalCredentialPath
  if (originalCredentialJson === undefined) delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  else process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = originalCredentialJson
})

describe('Earth Engine status endpoint', () => {
  it('rejects methods other than GET', async () => {
    const response = responseMock()
    await handler({ method: 'POST' }, response)

    expect(response.code).toBe(405)
    expect(response.headers.Allow).toBe('GET')
  })

  it('returns a generic unavailable error when server credentials are missing', async () => {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    const response = responseMock()
    await handler({ method: 'GET' }, response)

    expect(response.code).toBe(503)
    expect(response.payload).toEqual({ error: 'Earth Engine is not available' })
  })
})
