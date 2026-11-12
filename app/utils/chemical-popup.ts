import { ARSENIC_LIMIT_PPB, arsenicLevel, arsenicLevelMeta, type ArsenicLevel } from '../../src/lib/arsenic'
import { formatPpb } from '../../src/lib/survey'
import type { SurveyWaypointCluster } from '../../src/lib/waypoints'

type Tone = 'danger' | 'watch' | 'safe'
const toneOf: Record<ArsenicLevel, Tone> = { over: 'danger', watch: 'watch', normal: 'safe' }

export const ppbTone = (ppb: number): Tone => toneOf[arsenicLevel(ppb)]

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
export function buildChemicalPopup(
  cluster: SurveyWaypointCluster,
  dotColor: string,
  onDetail: () => void,
  options: { justSubmitted?: boolean; pendingReview?: boolean } = {},
) {
  const wp = cluster.latest
  const tone = ppbTone(cluster.maxPpb)
  const many = cluster.sampleCount > 1
  const date = formatDate(wp.collection_time || wp.created_at)

  const root = node('div', 'kok-pop')
  if (options.pendingReview) {
    root.append(node('p', 'kok-pop-badge kok-pop-badge-pending', 'จุดที่คุณส่ง • รอแอดมินตรวจ (> 50 ppb)'))
  } else if (options.justSubmitted) {
    root.append(node('p', 'kok-pop-badge kok-pop-badge-new', 'จุดที่คุณเพิ่งบันทึก'))
  }
  root.append(
    node('h3', '', wp.station_name || `จุดตรวจ ${wp.sample_code}`),
    node('p', 'kok-pop-sub', ['ผลชุดตรวจชาวบ้าน', date, many ? `${cluster.sampleCount} ครั้งในบริเวณนี้` : ''].filter(Boolean).join(' · ')),
  )

  const kpis = node('div', 'kok-pop-kpis')
  kpis.append(
    kpi(formatPpb(cluster.maxPpb), many ? `สารหนูสูงสุด · เกณฑ์ ${ARSENIC_LIMIT_PPB}` : `สารหนู · เกณฑ์ ${ARSENIC_LIMIT_PPB} ppb`, tone),
    many
      ? kpi(`${cluster.minPpb === 0 ? '< 5' : cluster.minPpb}–${cluster.maxPpb}`, `ช่วงค่า ppb จาก ${cluster.sampleCount} ครั้ง`)
      : kpi(arsenicLevelMeta[arsenicLevel(cluster.maxPpb)].label, 'เทียบเกณฑ์น้ำผิวดิน คพ.', tone),
  )

  const info = node('div', 'kok-pop-info')
  const list = node('ul', '')
  list.append(
    node('li', '', arsenicLevelMeta[arsenicLevel(cluster.maxPpb)].note),
    node('li', '', 'ชุดตรวจชาวบ้านใช้คัดกรองเบื้องต้น ไม่ใช่คำรับรองว่าน้ำดื่มได้'),
  )
  info.append(node('strong', '', 'อ่านผลอย่างไร'), list)

  const recorder = node('div', 'kok-pop-row')
  const dot = node('span', 'kok-pop-dot')
  dot.style.backgroundColor = dotColor
  const who = node('span', '')
  who.append(node('b', '', 'ผู้บันทึก '), wp.contributor_label || 'ผู้ส่งผลตรวจ')
  recorder.append(dot, who)
  const kit = wp.test_kit ? node('div', 'kok-pop-row') : null
  kit?.append(node('span', '', `ชุดตรวจ: ${wp.test_kit}`))

  const button = node('button', 'kok-pop-button', 'ดูรายละเอียดและกราฟ →')
  button.type = 'button'
  button.addEventListener('click', onDetail)

  root.append(kpis, info, recorder, ...(kit ? [kit] : []), node('p', 'kok-pop-foot', 'ชุดตรวจชาวบ้านวัดเฉพาะสารหนู · ● ชาวบ้าน'), button)
  return root
}
