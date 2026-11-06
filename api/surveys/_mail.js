import nodemailer from 'nodemailer'

// R10: a result above the review line is held back and the admins are told by email before it can be published.
// The mailbox and its app password come only from the server environment (SMTP_USER / SMTP_PASS); nothing is in code.
export function mailSettings(env = process.env) {
  const user = env.SMTP_USER?.trim() || ''
  // Google shows app passwords in groups of four; the spaces are not part of it.
  const pass = (env.SMTP_PASS || '').replace(/\s+/g, '')
  if (!user || !pass) return null
  const port = Number(env.SMTP_PORT) || 587
  const to = (env.ALERT_EMAIL_TO || user).split(',').map((address) => address.trim()).filter(Boolean)
  return {
    host: env.SMTP_HOST?.trim() || 'smtp.gmail.com',
    port,
    user,
    pass,
    fromName: env.SMTP_FROM_NAME?.trim() || 'kok-river-notification',
    to,
    siteUrl: (env.PUBLIC_SITE_URL || '').trim().replace(/\/+$/, ''),
  }
}

const thaiTime = (value) => new Date(value).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' })
const escape = (text) => String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

// The email names the sample, the reading, where and when; the reporter's name and phone stay in the admin page.
export function reviewAlertEmail(alert, siteUrl = '') {
  const map = `https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`
  const admin = siteUrl ? `${siteUrl}/?view=admin` : ''
  const lines = [
    `ผลตรวจ ${alert.sampleCode} รายงานสารหนู ${alert.ppb} ppb ซึ่งเกิน ${alert.reviewPpb} ppb`,
    'ระบบยังไม่เผยแพร่บนแผนที่สาธารณะ จนกว่าแอดมินจะตรวจและอนุมัติ',
    '',
    `เวลาเก็บตัวอย่าง: ${thaiTime(alert.collectedAt)}`,
    `แหล่งน้ำ: ${alert.waterSource || 'ไม่ระบุ'}`,
    `ตำแหน่ง: ${alert.latitude}, ${alert.longitude} (${map})`,
    '',
    admin ? `ตรวจและอนุมัติที่: ${admin}` : 'ตรวจและอนุมัติได้ที่หน้าแอดมิน เมนู ข้อมูลแผนที่หน้าบ้าน > ตรวจตัวอย่างน้ำ',
    'ข้อมูลติดต่อผู้ส่งดูได้ในหน้าแอดมิน (ไม่ส่งทางอีเมล)',
  ]
  const html = `<div style="font-family:sans-serif;line-height:1.6">
<h2 style="color:#b91c1c;margin:0 0 8px">ผลตรวจรออนุมัติ: ${escape(alert.ppb)} ppb</h2>
<p>ผลตรวจ <b>${escape(alert.sampleCode)}</b> รายงานสารหนู <b>${escape(alert.ppb)} ppb</b> ซึ่งเกิน ${escape(alert.reviewPpb)} ppb<br>
ระบบยังไม่เผยแพร่บนแผนที่สาธารณะ จนกว่าแอดมินจะตรวจและอนุมัติ</p>
<p>เวลาเก็บตัวอย่าง: ${escape(thaiTime(alert.collectedAt))}<br>
แหล่งน้ำ: ${escape(alert.waterSource || 'ไม่ระบุ')}<br>
ตำแหน่ง: <a href="${escape(map)}">${escape(alert.latitude)}, ${escape(alert.longitude)}</a></p>
${admin ? `<p><a href="${escape(admin)}" style="background:#0284c7;color:#fff;padding:8px 14px;border-radius:8px;text-decoration:none">เปิดหน้าตรวจและอนุมัติ</a></p>` : '<p>ตรวจและอนุมัติได้ที่หน้าแอดมิน เมนู ข้อมูลแผนที่หน้าบ้าน &gt; ตรวจตัวอย่างน้ำ</p>'}
<p style="color:#64748b;font-size:12px">ข้อมูลติดต่อผู้ส่งดูได้ในหน้าแอดมิน (ไม่ส่งทางอีเมล) · ส่งอัตโนมัติจาก MFU Kok Water Watch</p>
</div>`
  return { subject: `[รออนุมัติ] ผลตรวจสารหนู ${alert.ppb} ppb · ${alert.sampleCode}`, text: lines.join('\n'), html }
}

// Returns what happened so the alert record can say it: sent, not_configured or failed.
// It never throws: a mail problem must not lose the survey that was just saved.
export async function sendReviewAlert(alert, { env = process.env, createTransport = nodemailer.createTransport } = {}) {
  const settings = mailSettings(env)
  if (!settings) return { status: 'not_configured' }
  try {
    const transport = createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.port === 465,
      auth: { user: settings.user, pass: settings.pass },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    })
    const message = reviewAlertEmail(alert, settings.siteUrl)
    await transport.sendMail({ from: { name: settings.fromName, address: settings.user }, to: settings.to, ...message })
    return { status: 'sent', to: settings.to.length }
  } catch (error) {
    return { status: 'failed', error: String(error?.message || error).slice(0, 200) }
  }
}
