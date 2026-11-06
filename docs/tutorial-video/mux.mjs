// Joins output/screen.webm with the narration clips at their recorded start times.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const out = join(process.env.VIDEO_DIR ?? dirname(fileURLToPath(import.meta.url)), 'output')
const name = process.env.VIDEO_NAME ?? 'survey-tutorial'
const { total, timeline } = JSON.parse(readFileSync(join(out, 'timeline.json'), 'utf8'))
const screen = join(out, 'screen.webm')
const recorded = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', screen], { encoding: 'utf8' }))
// The webm also holds the page load before the first step; drop it.
const trim = Math.max(0, recorded - total)
const clips = timeline.map((seg) => ({ ...seg, file: join(out, 'voice', `${seg.id}.wav`) })).filter((seg) => existsSync(seg.file))
const hasVoice = clips.length === timeline.length
const target = join(out, hasVoice ? `${name}.mp4` : `${name}-silent-draft.mp4`)

const args = ['-y', '-v', 'error', '-ss', trim.toFixed(3), '-i', screen]
if (hasVoice) {
  for (const clip of clips) args.push('-i', clip.file)
  const delays = clips.map((clip, index) => `[${index + 1}:a]adelay=${Math.round(clip.start * 1000)}:all=1[a${index}]`)
  const inputs = clips.map((_, index) => `[a${index}]`).join('')
  args.push('-filter_complex', `${delays.join(';')};${inputs}amix=inputs=${clips.length}:normalize=0:duration=longest[voice]`, '-map', '0:v', '-map', '[voice]', '-c:a', 'aac', '-b:a', '160k')
}
args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-t', total.toFixed(3), target)
execFileSync('ffmpeg', args, { stdio: 'inherit' })
console.log(JSON.stringify({ target, trim, seconds: total, hasVoice }))
