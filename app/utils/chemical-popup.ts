import type { SurveyWaypointCluster } from '../../src/lib/waypoints'

type Tone = 'danger' | 'watch' | 'safe'

export const ppbTone = (ppb: number): Tone => (ppb > 10 ? 'danger' : ppb >= 5 ? 'watch' : 'safe')

const toneLabel: Record<Tone, string> = { danger: 'เกินเกณฑ์', watch: 'เฝ้าระวัง', safe: 'ปกติ' }
const toneNote: Record<Tone, string> = {
  danger: 'ค่านี้เกินเกณฑ์ 10 ppb ของ คพ. (น้ำผิวดิน)',
  watch: 'ค่าอยู่ในช่วงเฝ้าระวัง 5–10 ppb',
  safe: 'ค่าต่ำกว่า 5 ppb',
}

function node<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const element = document.createElement(tag)
  element.className = className
  if (text !== undefined) element.textContent = text
  return element
}

function kpi(value: string, caption: string, tone?: Tone) {
  const box = node('div', 'kok-pop-kpi')
  box.append(node('b', tone ? `kok-pop-${tone}` : '', value), node('span', '', caption))
  return box
}

const formatDate = (iso: string) => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Map popup for one cluster of citizen test-kit results. Text goes in as textContent, never HTML.
export function buildChemicalPopup(cluster: SurveyWaypointCluster, dotColor: string, onDetail: () => void) {
  const wp = cluster.latest
  const tone = ppbTone(cluster.maxPpb)
  const many = cluster.sampleCount > 1
  const date = formatDate(wp.collection_time || wp.created_at)

  const root = node('div', 'kok-pop')
  root.append(
    node('h3', '', wp.station_name || `จุดตรวจ ${wp.sample_code}`),
    node('p', 'kok-pop-sub', ['ผลชุดตรวจชาวบ้าน', date, many ? `${cluster.sampleCount} ครั้งในบริเวณนี้` : ''].filter(Boolean).join(' · ')),
  )

  const kpis = node('div', 'kok-pop-kpis')
  kpis.append(
    kpi(`${cluster.maxPpb} ppb`, many ? 'สารหนูสูงสุด · เกณฑ์ 10' : 'สารหนู · เกณฑ์ 10 ppb', tone),
    many
      ? kpi(`${cluster.minPpb}–${cluster.maxPpb}`, `ช่วงค่า ppb จาก ${cluster.sampleCount} ครั้ง`)
      : kpi(toneLabel[tone], 'เทียบเกณฑ์น้ำผิวดิน คพ.', tone),
  )

  const info = node('div', 'kok-pop-info')
  const list = node('ul', '')
  list.append(
    node('li', '', toneNote[tone]),
    node('li', '', 'ชุดตรวจชาวบ้านใช้คัดกรองเบื้องต้น ไม่ใช่คำรับรองว่าน้ำดื่มได้'),
  )
  info.append(node('strong', '', 'อ่านผลอย่างไร'), list)

  const recorder = node('div', 'kok-pop-row')
  const dot = node('span', 'kok-pop-dot')
  dot.style.backgroundColor = dotColor
  const who = node('span', '')
  who.append(node('b', '', 'ผู้บันทึก '), wp.contributor_label || 'ผู้ส่งผลตรวจ')
  recorder.append(dot, who)

  const button = node('button', 'kok-pop-button', 'ดูรายละเอียดและกราฟ →')
  button.type = 'button'
  button.addEventListener('click', onDetail)

  root.append(kpis, info, recorder, node('p', 'kok-pop-foot', 'ชุดตรวจชาวบ้านวัดเฉพาะสารหนู · ● ชาวบ้าน'), button)
  return root
}
