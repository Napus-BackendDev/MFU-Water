import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render(container: HTMLElement, options: { sitekey: string; action: string; theme: string }): string
      remove(id: string): void
    }
  }
}

export function SurveyCaptcha({ siteKey }: { siteKey: string }) {
  const container = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let widget: string | undefined
    let active = true
    const render = () => {
      if (active && container.current && window.turnstile && widget === undefined) {
        try { widget = window.turnstile.render(container.current, { sitekey: siteKey, action: 'survey', theme: 'light' }) }
        catch { setFailed(true) }
      }
    }
    let script = document.querySelector<HTMLScriptElement>('script[data-survey-captcha]')
    const created = !script
    if (!script) {
      script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.dataset.surveyCaptcha = 'true'
    }
    const fail = () => { if (active) setFailed(true) }
    script.addEventListener('load', render)
    script.addEventListener('error', fail)
    if (created) document.head.appendChild(script)
    render()
    return () => {
      active = false
      script.removeEventListener('load', render)
      script.removeEventListener('error', fail)
      if (widget !== undefined) window.turnstile?.remove(widget)
    }
  }, [siteKey])
  return <div className="survey-captcha" aria-label="ยืนยัน CAPTCHA">
    <div ref={container} />
    {failed && <p role="alert">โหลด CAPTCHA ไม่สำเร็จ กรุณาโหลดหน้าใหม่</p>}
  </div>
}
