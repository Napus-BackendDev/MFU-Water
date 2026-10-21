import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Camera, ClipboardList, Crosshair, MapPin, X } from 'lucide-react'
import { arsenicLevels, submitWaterSurvey, validateSurveyPhoto, type SurveyCoordinates, type SurveyPhoto, type SurveyWaypoint } from '../lib/survey'
import { supabase } from '../lib/supabase'
import { turnstileSiteKey, turnstileEnabled } from '../config/env'
import { SurveyCaptcha } from './SurveyCaptcha'

type SurveyDialogProps = { onClose: () => void; onWaypointCreated: (waypoint: SurveyWaypoint) => void }

const geolocationErrors: Record<number, string> = {
  1: 'อนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์ก่อนบันทึกพิกัด',
  2: 'ไม่พบตำแหน่งปัจจุบัน กรุณาลองอีกครั้ง',
  3: 'ค้นหาตำแหน่งนานเกินไป กรุณาลองอีกครั้ง',
}

function SurveyDialog({ onClose, onWaypointCreated }: SurveyDialogProps) {
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [arsenicLevel, setArsenicLevel] = useState<number | null>(null)
  const [coordinateText, setCoordinateText] = useState<[string, string]>(['', ''])
  const [latitude, longitude] = coordinateText.map(Number)
  const coordinates: SurveyCoordinates | null = coordinateText.every((value) => value !== '') && Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null
  const [gpsAccuracyMeters, setGpsAccuracyMeters] = useState<number | null>(null)
  const [locationState, setLocationState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [photos, setPhotos] = useState<[SurveyPhoto, SurveyPhoto]>([null, null])
  const [photoErrors, setPhotoErrors] = useState<[string | null, string | null]>([null, null])
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [publicConsent, setPublicConsent] = useState(false)
  const fileInputs = useRef<[HTMLInputElement | null, HTMLInputElement | null]>([null, null])

  const close = () => {
    if (!saving) onClose()
  }

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setLocationState('error')
      setFormError('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง')
      return
    }

    setFormError(null)
    setLocationState('loading')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoordinateText([String(coords.latitude), String(coords.longitude)])
        setGpsAccuracyMeters(Number.isFinite(coords.accuracy) ? Math.round(coords.accuracy) : null)
        setLocationState('idle')
      },
      ({ code }) => {
        setLocationState('error')
        setFormError(geolocationErrors[code] ?? 'อ่านตำแหน่งไม่สำเร็จ กรุณาลองอีกครั้ง')
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  }

  const selectPhoto = async (index: 0 | 1, event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0] ?? null
    if (!file) return

    setPhotos((current) => current.map((value, position) => position === index ? file : value) as [SurveyPhoto, SurveyPhoto])
    setPhotoErrors((current) => current.map((value, position) => position === index ? null : value) as [string | null, string | null])
    const error = await validateSurveyPhoto(file)
    setPhotoErrors((current) => current.map((value, position) => position === index ? error : value) as [string | null, string | null])
    if (error) {
      setPhotos((current) => current.map((value, position) => position === index ? null : value) as [SurveyPhoto, SurveyPhoto])
      input.value = ''
      return
    }

    setFormError(null)
  }

  const removePhoto = (index: 0 | 1) => {
    setPhotos((current) => current.map((value, position) => position === index ? null : value) as [SurveyPhoto, SurveyPhoto])
    setPhotoErrors((current) => current.map((value, position) => position === index ? null : value) as [string | null, string | null])
    if (fileInputs.current[index]) fileInputs.current[index]!.value = ''
  }

  const saveSurvey = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    if (arsenicLevel === null) {
      setFormError('กรุณาเลือกระดับสารหนู')
      return
    }
    if (!coordinates) {
      setFormError('กรุณาบันทึกพิกัด GPS ปัจจุบัน')
      return
    }
    if (!publicConsent) {
      setFormError('กรุณายินยอมเผยแพร่พิกัด GPS และผลตรวจบนแผนที่สาธารณะ')
      return
    }
    const turnstileToken = String(new FormData(event.currentTarget).get('cf-turnstile-response') ?? '')
    if (turnstileEnabled && (!turnstileToken || !turnstileSiteKey)) {
      setFormError(!turnstileSiteKey ? 'ยังไม่ได้ตั้งค่า CAPTCHA กรุณาติดต่อผู้ดูแลระบบ' : 'กรุณายืนยัน CAPTCHA ก่อนส่งแบบสำรวจ')
      return
    }
    if (photoErrors.some(Boolean)) {
      setFormError('กรุณาเลือกไฟล์ภาพที่รองรับ')
      return
    }

    setSaving(true)
    try {
      const waypoint = await submitWaterSurvey(supabase, {
        fullName,
        phoneNumber,
        arsenicLevelPpb: arsenicLevel,
        coordinates,
        gpsAccuracyMeters,
        photos,
        turnstileToken,
        publicConsent,
      })
      onWaypointCreated(waypoint)
      setSaved(true)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'บันทึกแบบสำรวจไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="survey-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) close()
    }} onKeyDown={(event) => {
      if (event.key === 'Escape') close()
    }}>
      <section className="survey-dialog survey-dialog-expanded" role="dialog" aria-modal="true" aria-labelledby="survey-title">
        <form className="survey-form" onSubmit={saveSurvey} noValidate>
          <header className="survey-dialog-header">
            <div className="survey-dialog-icon"><ClipboardList size={20} /></div>
            <div><p>MFU KOK WATER WATCH</p><h2 id="survey-title">ทำแบบสำรวจ</h2></div>
            <button className="survey-close" type="button" aria-label="ปิดหน้าต่าง" onClick={close} disabled={saving}><X size={19} /></button>
          </header>

          <div className="survey-fields">
            <label>ชื่อ-นามสกุล / Full Name
              <input type="text" autoComplete="name" maxLength={200} placeholder="" value={fullName} onChange={(event) => setFullName(event.currentTarget.value)} disabled={saving || saved} />
            </label>

            <label>เบอร์โทรศัพท์ / Phone Number
              <input type="tel" autoComplete="tel" maxLength={40} placeholder="" value={phoneNumber} onChange={(event) => setPhoneNumber(event.currentTarget.value)} disabled={saving || saved} />
            </label>

            <fieldset className="arsenic-choice" disabled={saving || saved}>
              <legend>โปรดเลือกสีที่ตรงกับผลตรวจของท่าน (Arsenic Level) <span>*ต้องระบุ</span></legend>
              <div className="arsenic-options" role="radiogroup" aria-label="ระดับสารหนู (As) หน่วย ppb" aria-required="true" aria-invalid={arsenicLevel === null && Boolean(formError)}>
                {arsenicLevels.map((level, index) => (
                  <button
                    className={`arsenic-option arsenic-option-${index + 1}${arsenicLevel === level ? ' is-selected' : ''}`}
                    key={level}
                    type="button"
                    role="radio"
                    aria-checked={arsenicLevel === level}
                    aria-label={`${index + 1}: ${level} ppb`}
                    onClick={() => { setArsenicLevel(level); setFormError(null) }}
                  >
                    <span className="arsenic-option-number">{index + 1}</span>
                    <i aria-hidden="true" />
                    <span className="arsenic-option-value">{level} ppb</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="survey-location" disabled={saving || saved}>
              <legend>ระบุพิกัดที่ตั้ง (Location) <span>*ต้องระบุพิกัดที่ตั้ง</span></legend>
              <button className="survey-gps-button" type="button" onClick={captureLocation} disabled={locationState === 'loading'}>
                <MapPin size={15} aria-hidden="true" />
                {locationState === 'loading' ? 'กำลังค้นหาตำแหน่ง…' : 'กดปุ่มเพื่อพิกัด GPS ปัจจุบัน'}
                <Crosshair size={15} aria-hidden="true" />
              </button>
              <div className="survey-coordinate-row">
                {['ละติจูด', 'ลองจิจูด'].map((label, index) => <label key={label}>{label}
                  <input aria-label={label} type="number" step="any" value={coordinateText[index]} placeholder="ยังไม่ทราบ" onChange={(event) => {
                    const value = event.currentTarget.value
                    setCoordinateText((current) => index === 0 ? [value, current[1]] : [current[0], value])
                    setGpsAccuracyMeters(null)
                  }} />
                </label>)}
              </div>
              {gpsAccuracyMeters !== null && <small className="survey-gps-accuracy">ความแม่นยำ GPS ประมาณ {gpsAccuracyMeters} เมตร</small>}
            </fieldset>

            <fieldset className="survey-photos" disabled={saving || saved}>
              <legend><Camera size={14} aria-hidden="true" /> แนบรูปถ่ายการเก็บตัวอย่าง</legend>
              <div className="survey-photo-grid">
                {photos.map((photo, index) => {
                  const position = index as 0 | 1
                  return (
                    <div className="survey-photo-card" key={index}>
                      <span className="survey-photo-title">ภาพที่ {index + 1}</span>
                      <label className="survey-photo-drop">
                        <input
                          ref={(element) => { fileInputs.current[position] = element }}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          aria-label={`เลือกภาพที่ ${index + 1}`}
                          onChange={(event) => void selectPhoto(position, event)}
                        />
                        <Camera size={19} aria-hidden="true" />
                        <span>{photo ? photo.name : 'คลิกเพื่อเลือกภาพหรือถ่ายรูป'}</span>
                      </label>
                      {photo && <button type="button" className="survey-photo-remove" onClick={() => removePhoto(position)} aria-label={`ลบภาพที่ ${index + 1}`}>ลบภาพนี้</button>}
                      {photoErrors[position] && <span className="survey-photo-error" role="alert">{photoErrors[position]}</span>}
                    </div>
                  )
                })}
              </div>
            </fieldset>

            <label className="survey-consent">
              <input type="checkbox" checked={publicConsent} onChange={(event) => { setPublicConsent(event.currentTarget.checked); setFormError(null) }} disabled={saving || saved} />
              <span>ยินยอมให้เผยแพร่พิกัด GPS และผลตรวจสารหนูบนแผนที่สาธารณะ ชื่อ เบอร์โทร และรูปถ่ายจะไม่แสดงบนแผนที่</span>
            </label>

            {turnstileEnabled && (turnstileSiteKey ? <SurveyCaptcha siteKey={turnstileSiteKey} /> : <p className="survey-form-message is-error" role="status">ยังไม่ได้ตั้งค่า CAPTCHA; ส่งแบบสำรวจถูกปิดไว้</p>)}

            {formError && <p className="survey-form-message is-error" role="alert">{formError}</p>}
            {saved && <p className="survey-form-message is-success" role="status">บันทึกผลสำรวจเรียบร้อยแล้ว</p>}
          </div>

          <footer className="survey-dialog-footer">
            <button type="button" className="survey-cancel" onClick={close} disabled={saving}>{saved ? 'ปิด' : 'ยกเลิก'}</button>
            {!saved && <button type="submit" className="survey-save" disabled={saving}>{saving ? 'กำลังบันทึก…' : 'ส่งข้อมูลบันทึก'}</button>}
          </footer>
        </form>
      </section>
    </div>
  )
}

export default SurveyDialog
