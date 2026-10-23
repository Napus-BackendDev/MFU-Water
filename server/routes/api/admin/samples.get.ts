import { defineEventHandler, createError } from 'h3'
import { verifyAdminToken, supabaseRequest } from '../../../utils/admin-helper'

export default defineEventHandler(async (event) => {
  const isAuthed = verifyAdminToken(event)
  if (!isAuthed) {
    throw createError({ statusCode: 401, statusMessage: 'กรุณาเข้าสู่ระบบด้วยรหัสผ่านแอดมินก่อน' })
  }
  try {
    const rSamples = await supabaseRequest(
      '/rest/v1/kok_water_samples?select=sample_code,station_name,latitude,longitude,collection_time,gps_accuracy_meters,arsenic_ppb,measurements,sample_nature,publication_status,created_at,reviewed_at,review_reason,private_photo_paths&order=collection_time.desc&limit=500'
    )
    const allRows = rSamples.ok ? await rSamples.json() : []

    const rContacts = await supabaseRequest(
      '/rest/v1/kok_sample_contacts?select=sample_code,name,phone&limit=1000'
    )
    const contactMap = new Map<string, { name: string; phone: string }>()
    if (rContacts.ok) {
      const contactRows = await rContacts.json()
      for (const c of contactRows) {
        contactMap.set(c.sample_code, { name: c.name, phone: c.phone })
      }
    }

    const enhanced = allRows.map((row: any) => {
      const contact = contactMap.get(row.sample_code)
      return {
        ...row,
        contact_name: contact?.name || null,
        contact_phone: contact?.phone || null,
      }
    })

    const rAlerts = await supabaseRequest(
      '/rest/v1/kok_admin_alerts?select=*&order=created_at.desc&limit=100'
    )
    const alerts = rAlerts.ok ? await rAlerts.json() : []

    const pending = enhanced.filter((r: any) => r.publication_status === 'pending_review')
    const approved = enhanced.filter((r: any) => r.publication_status === 'approved')
    const autoPublished = enhanced.filter((r: any) => r.publication_status === 'auto_published')
    const rejected = enhanced.filter((r: any) => r.publication_status === 'rejected')

    return {
      samples: enhanced,
      pending,
      counts: {
        total: enhanced.length,
        pending: pending.length,
        approved: approved.length,
        autoPublished: autoPublished.length,
        rejected: rejected.length,
      },
      alerts,
    }
  } catch (err: any) {
    throw createError({ statusCode: 503, statusMessage: 'ไม่สามารถโหลดข้อมูลคิวแอดมินได้: ' + (err?.message || '') })
  }
})
