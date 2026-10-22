import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export function publicMyMapsPayload(data) {
  if (!data || !Array.isArray(data.layers) || data.layers.length !== 6) {
    throw new Error('Invalid My Maps dataset: expected 6 layers')
  }
  if (data.sourceRowsPerLayer !== 129 || data.distinctCoordinates !== 125) {
    throw new Error('Unexpected rows/coordinates count in My Maps dataset')
  }
  return {
    ...data,
    visibility: 'public',
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.env.LOCALAPPDATA) throw new Error('LOCALAPPDATA is required')
  const source = join(process.env.LOCALAPPDATA, 'MFUKokWaterWatch/restricted/mymaps-20261020/review.json')
  const raw = JSON.parse(await readFile(source, 'utf8'))
  const data = publicMyMapsPayload(raw)
  await mkdir('public/mymaps', { recursive: true })
  await writeFile('public/mymaps/thaton.json', JSON.stringify(data) + '\n')
  console.log(`Published My Maps data (${data.layers.length} layers, ${data.sourceRowsPerLayer} rows/layer, ${data.distinctCoordinates} coordinates) to public/mymaps/thaton.json`)
}
