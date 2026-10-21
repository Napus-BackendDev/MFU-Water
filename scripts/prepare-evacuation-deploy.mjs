import { randomBytes, createHash } from 'node:crypto'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { evacuationPayload } from '../api/evacuation/_shared.js'

if (!process.env.LOCALAPPDATA) throw new Error('LOCALAPPDATA is required')
const root = join(process.env.LOCALAPPDATA, 'MFUKokWaterWatch/restricted')
const data = JSON.parse(await readFile(join(root, 'evacuation-review.json'), 'utf8'))
const payload = evacuationPayload(data)
// Re-wrap alignment metadata to match the server's input schema.
const input = { ...payload, routeAlignment: { method: payload.routeAlignment } }
const folder = join(root, 'deployment', new Date().toISOString().replace(/[:.]/g, '-'))
await mkdir(folder, { recursive: true, mode: 0o700 })
const key = randomBytes(32).toString('hex')
await writeFile(join(folder, 'EVACUATION_DATA_JSON.txt'), JSON.stringify(input), { mode: 0o600, flag: 'wx' })
await writeFile(join(folder, 'EVACUATION_ACCESS_KEY_SHA256.txt'), createHash('sha256').update(key).digest('hex'), { mode: 0o600, flag: 'wx' })
await writeFile(join(folder, 'access-key.txt'), key, { mode: 0o600, flag: 'wx' })
console.log(`Prepared restricted deployment bundle: ${folder}`)
console.log(`Points: ${payload.points.length}; routes: ${payload.routes.length}. Access key and coordinates were not printed.`)
