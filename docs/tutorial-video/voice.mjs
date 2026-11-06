// Generates the Thai narration with Gemini TTS. Reads the key from GEMINI_API_KEY only, never stores it.
// Already generated clips are skipped, so a rerun resumes after a rate limit.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = process.env.VIDEO_DIR ?? dirname(fileURLToPath(import.meta.url))
const voiceDir = join(here, 'output', 'voice')
const key = process.env.GEMINI_API_KEY?.trim()
const voiceName = process.env.GEMINI_VOICE ?? 'Kore'
const preferredModels = ['gemini-3.1-flash-tts-preview', 'gemini-2.5-pro-preview-tts', 'gemini-2.5-flash-preview-tts']
const api = 'https://generativelanguage.googleapis.com/v1beta/models'
const headers = { 'content-type': 'application/json', 'x-goog-api-key': key }

if (!key) {
  console.error('GEMINI_API_KEY is not set')
  process.exit(1)
}
mkdirSync(voiceDir, { recursive: true })

const listed = await fetch(`${api}?pageSize=200`, { headers })
if (!listed.ok) throw new Error(`Cannot list Gemini models: HTTP ${listed.status}`)
const available = (await listed.json()).models.map((model) => model.name.replace('models/', ''))
const model = preferredModels.find((name) => available.includes(name)) ?? available.find((name) => name.includes('tts'))
if (!model) throw new Error('This API key has no Gemini TTS model available')
console.log(`model: ${model}, voice: ${voiceName}`)

function wav(pcm) {
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVEfmt ', 8)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(24000, 24)
  header.writeUInt32LE(48000, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}

async function speak(text) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const response = await fetch(`${api}/${model}:generateContent`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Read this Thai software tutorial narration in a clear, friendly, natural voice at a brisk pace: ${text}` }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } },
      }),
    })
    if (response.status === 429 || response.status >= 500) {
      console.log(`HTTP ${response.status}, waiting 30s (attempt ${attempt}/5)`)
      await new Promise((resolve) => setTimeout(resolve, 30000))
      continue
    }
    if (!response.ok) throw new Error(`Gemini TTS failed: HTTP ${response.status} ${(await response.text()).slice(0, 300)}`)
    const data = (await response.json()).candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
    if (!data) throw new Error('Gemini TTS returned no audio')
    return Buffer.from(data, 'base64')
  }
  throw new Error('Gemini TTS is still rate limited, run this command again in a minute')
}

const durations = {}
for (const seg of JSON.parse(readFileSync(join(here, 'narration.json'), 'utf8'))) {
  const file = join(voiceDir, `${seg.id}.wav`)
  if (!existsSync(file)) {
    writeFileSync(file, wav(await speak(seg.text)))
    console.log(`done: ${seg.id}`)
  }
  durations[seg.id] = (statSync(file).size - 44) / 48000
}
writeFileSync(join(here, 'output', 'durations.json'), JSON.stringify(durations, null, 2))
const total = Object.values(durations).reduce((sum, value) => sum + value, 0)
console.log(`speech total: ${total.toFixed(1)}s`)
console.log('Voice ready. Tell Claude to finish the video.')
