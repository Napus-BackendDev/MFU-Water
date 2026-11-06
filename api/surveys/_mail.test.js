import { describe, expect, it } from 'vitest'
import { mailSettings, reviewAlertEmail, sendReviewAlert } from './_mail.js'

const alert = { sampleCode: 'KOK-20261106-0001', ppb: 100, reviewPpb: 50, collectedAt: '2026-11-06T05:00:00Z', waterSource: 'แม่น้ำ', latitude: 20.058, longitude: 99.3655 }
const env = { SMTP_USER: 'box@example.com', SMTP_PASS: 'abcd efgh ijkl mnop', SMTP_PORT: '25', ALERT_EMAIL_TO: 'a@example.com, b@example.com', PUBLIC_SITE_URL: 'https://kok.example/' }

describe('review alert email', () => {
  it('stays off until the server has a mailbox, and reads it only from the environment', () => {
    expect(mailSettings({})).toBeNull()
    expect(mailSettings({ SMTP_USER: 'box@example.com' })).toBeNull()
    expect(mailSettings(env)).toMatchObject({ host: 'smtp.gmail.com', port: 25, pass: 'abcdefghijklmnop', fromName: 'kok-river-notification', to: ['a@example.com', 'b@example.com'], siteUrl: 'https://kok.example' })
    // No list of recipients: the mailbox itself is told.
    expect(mailSettings({ SMTP_USER: 'box@example.com', SMTP_PASS: 'x' }).to).toEqual(['box@example.com'])
  })

  it('names the sample, the reading and where to approve it, without the reporter contact', () => {
    const mail = reviewAlertEmail(alert, 'https://kok.example')
    expect(mail.subject).toContain('100 ppb')
    expect(mail.subject).toContain('KOK-20261106-0001')
    expect(mail.text).toContain('https://kok.example/?view=admin')
    expect(mail.text).toContain('20.058, 99.3655')
    expect(mail.html).not.toContain('<script')
  })

  it('reports not_configured, sent or failed and never throws', async () => {
    expect(await sendReviewAlert(alert, { env: {} })).toEqual({ status: 'not_configured' })

    const sent = []
    const ok = await sendReviewAlert(alert, { env, createTransport: (options) => ({ sendMail: async (message) => { sent.push({ options, message }) } }) })
    expect(ok).toEqual({ status: 'sent', to: 2 })
    expect(sent[0].options).toMatchObject({ port: 25, secure: false, auth: { user: 'box@example.com', pass: 'abcdefghijklmnop' } })
    expect(sent[0].message.from).toEqual({ name: 'kok-river-notification', address: 'box@example.com' })

    const failed = await sendReviewAlert(alert, { env, createTransport: () => ({ sendMail: async () => { throw new Error('535 auth failed') } }) })
    expect(failed).toEqual({ status: 'failed', error: '535 auth failed' })
  })
})
