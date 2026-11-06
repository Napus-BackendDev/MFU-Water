import { arsenicLevelMeta } from '../../src/lib/arsenic'
import { arsenicSeverity, type AdminSample } from './admin-types'


export function exportSamplesCsv(samples: AdminSample[]) {
  if (!samples.length) return
  const headers = ['รหัสตัวอย่าง', 'วันเวลาบันทึก', 'ค่าสารหนู (ppb)', 'สถานะค่าสารหนู', 'ละติจูด', 'ลองจิจูด', 'แหล่งน้ำ', 'ลักษณะน้ำ', 'ชื่อผู้แจ้ง', 'เบอร์โทรศัพท์', 'สถานะเผยแพร่', 'ตรวจโดย', 'หมายเหตุแอดมิน']
  const quote = (value: unknown) => `"${String(value ?? '-').replaceAll('"', '""')}"`
  const rows = samples.map((s) => [
    quote(s.sample_code),
    quote(s.collection_time || s.created_at),
    s.arsenic_ppb,
    quote(arsenicLevelMeta[arsenicSeverity(s.arsenic_ppb)].label),
    s.latitude,
    s.longitude,
    quote(s.sample_nature?.water_source || 'แม่น้ำกก'),
    quote(s.sample_nature?.water_appearance || '-'),
    quote(s.contact_name || '-'),
    quote(s.contact_phone || '-'),
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
