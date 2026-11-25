import { arsenicLevelMeta } from '../../src/lib/arsenic'
import { communityOfPoint } from '../../src/lib/community-of-point'
import { arsenicSeverity, type AdminSample } from './admin-types'
import { communityTargets } from './kok-contract'

export function getCsvCommunityName(sample: AdminSample): string {
  const matched = communityOfPoint(sample.latitude, sample.longitude, communityTargets, 25)
  if (matched) return matched.name
  if (sample.station_name) {
    if (sample.station_name.includes('ท่าตอน')) return 'ท่าตอน'
    if (sample.station_name.includes('รวมมิตร') || sample.station_name.includes('กะเหรี่ยง')) return 'กะเหรี่ยงรวมมิตร'
    if (sample.station_name.includes('ปงของ')) return 'ปงของ'
    if (sample.station_name.includes('ปากอิง')) return 'ปากอิงใต้'
  }
  return 'อื่นๆ'
}

export function buildCsvPhotoUrl(path?: string): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://127.0.0.1:5173'
  return `${origin}/api/admin/photo?path=${encodeURIComponent(path)}`
}

function quotePhotoLink(path?: string): string {
  const url = buildCsvPhotoUrl(path)
  if (!url) return '"-"'
  const safe = url.replaceAll('"', '""')
  return `"=HYPERLINK(""${safe}"",""${safe}"")"`
}

export function exportSamplesCsv(samples: AdminSample[]) {
  if (!samples.length) return
  const headers = [
    'วันเวลาบันทึก',
    'ชุมชน',
    'ค่าสารหนู (ppb)',
    'สถานะค่าสารหนู',
    'ชุดตรวจ',
    'ละติจูด',
    'ลองจิจูด',
    'ชื่อผู้แจ้ง',
    'เบอร์โทรศัพท์',
    'ลิงก์ภาพที่ 1 (เครื่องมือการเทสต์น้ำ)',
    'ลิงก์ภาพที่ 2 (สถานที่เก็บตัวอย่าง)',
    'สถานะเผยแพร่',
    'ตรวจโดย',
    'หมายเหตุแอดมิน',
  ]
  const quote = (value: unknown) => `"${String(value ?? '-').replaceAll('"', '""')}"`
  const rows = samples.map((s) => [
    quote(s.collection_time || s.created_at),
    quote(getCsvCommunityName(s)),
    s.arsenic_ppb,
    quote(arsenicLevelMeta[arsenicSeverity(s.arsenic_ppb)].label),
    quote(s.sample_nature?.test_kit || 'Oxfam'),
    s.latitude,
    s.longitude,
    quote(s.contact_name || '-'),
    quote(s.contact_phone || '-'),
    quotePhotoLink(s.private_photo_paths?.[0]),
    quotePhotoLink(s.private_photo_paths?.[1]),
    quote(s.publication_status),
    quote(s.reviewed_by || '-'),
    quote(s.review_reason || '-'),
  ])

  const csv = '﻿' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `kok-water-admin-export-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
