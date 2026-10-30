import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Check, ChevronDown, CircleHelp, ClipboardList, Download, Minus, Plus, Settings, Waves, X } from 'lucide-react'
import SurveyDialog from './components/SurveyDialog'
import type { MapController } from './components/MapView'
import { mapTilerApiKey } from './config/env'
import { fetchSurveyWaypoints, type SurveyCoordinates, type SurveyWaypoint } from './lib/survey'
import { countTodaysWaterStatuses, createPublicWaypointsCsv } from './lib/water-status'
import './App.css'

const MapView = lazy(() => import('./components/MapView'))

const defaultLocation: SurveyCoordinates = { latitude: 20.0451, longitude: 99.8912 }
const riverOptions = [
  { label: 'แม่น้ำทุกสาย', value: '' },
  { label: 'แม่น้ำกก', value: 'Kok' },
  { label: 'แม่น้ำโขง', value: 'Mekong' },
  { label: 'แม่น้ำรวก', value: 'Ruak' },
  { label: 'แม่น้ำสาย', value: 'Sai' },
  { label: 'แม่น้ำสาละวิน', value: 'Salween' },
  { label: 'แม่น้ำกระบุรี', value: 'Kraburi' },
]

function App({ mapKey = mapTilerApiKey }: { mapKey?: string } = {}) {
  const [coordinates, setCoordinates] = useState(defaultLocation)
  const [surveyOpen, setSurveyOpen] = useState(false)
  const [surveyWaypoints, setSurveyWaypoints] = useState<SurveyWaypoint[]>([])
  const [waypointLoadState, setWaypointLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [utilityPanel, setUtilityPanel] = useState<'guide' | 'summary' | null>(null)
  const [actionFeedback, setActionFeedback] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [waterwaysVisible, setWaterwaysVisible] = useState(false)
  const [riverName, setRiverName] = useState('Kok')
  const [riverLoadState, setRiverLoadState] = useState('')
  const [loadingWaterways, setLoadingWaterways] = useState(false)
  const [areaMode, setAreaMode] = useState<'actual' | 'virtual'>('actual')
  const [drawingArea, setDrawingArea] = useState(false)
  const [showVirtualArea, setShowVirtualArea] = useState(true)
  const [virtualArea, setVirtualArea] = useState<SurveyCoordinates[]>([])
  const askedForLocation = useRef(false)
  const mapController = useRef<MapController>(null)
  const todayStatus = useMemo(() => countTodaysWaterStatuses(surveyWaypoints), [surveyWaypoints])
  const basinStatusCounts = [
    { label: 'วิกฤต', count: todayStatus.critical, className: 'status-critical' },
    { label: 'เฝ้าระวัง', count: todayStatus.watch, className: 'status-watch' },
    { label: 'ปกติ', count: todayStatus.normal, className: 'status-normal' },
  ]

  const locateUser = useCallback(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoordinates({ latitude: coords.latitude, longitude: coords.longitude })
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  }, [])

  useEffect(() => {
    if (askedForLocation.current) return
    askedForLocation.current = true
    locateUser()
  }, [locateUser])

  useEffect(() => {
    let active = true
    void fetchSurveyWaypoints().then((waypoints) => {
      if (active) {
        setSurveyWaypoints(waypoints)
        setWaypointLoadState('ready')
      }
    }).catch(() => {
      if (active) setWaypointLoadState('error')
    })
    return () => { active = false }
  }, [])

  const handleWaypointCreated = useCallback((waypoint: SurveyWaypoint) => {
    setSurveyWaypoints((current) => [waypoint, ...current.filter((item) => item.id !== waypoint.id)])
    setWaypointLoadState('ready')
    mapController.current?.focusOnWaypoint(waypoint)
  }, [])

  const exportWaypoints = () => {
    if (!surveyWaypoints.length) {
      setActionFeedback('ยังไม่มีผลตรวจให้ส่งออก')
      return
    }
    const url = URL.createObjectURL(new Blob([createPublicWaypointsCsv(surveyWaypoints)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `mfu-kok-water-waypoints-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    setActionFeedback(`ส่งออกผลตรวจ ${surveyWaypoints.length} จุดแล้ว`)
  }

  return (
    <main className="map-app">
      <div className="map-canvas">
        <Suspense fallback={<div className="map-loading-message" role="status">กำลังเตรียมแผนที่…</div>}>
          <MapView
            ref={mapController}
            apiKey={mapKey}
            coordinates={coordinates}
            waterwaysVisible={waterwaysVisible}
            drawingArea={drawingArea}
            showVirtualArea={showVirtualArea && areaMode === 'virtual'}
            virtualArea={virtualArea}
            waypoints={surveyWaypoints}
            onMapClick={(coordinate) => setVirtualArea((points) => [...points, coordinate])}
          />
        </Suspense>

        <section className="basin-status-card" aria-labelledby="basin-status-title">
          <h1 id="basin-status-title">สถานการณ์ลุ่มน้ำวันนี้</h1>
          {waypointLoadState === 'ready' ? <div
            className="basin-status-bar"
            role="img"
            aria-label={`แถบสัดส่วนสถานะวันนี้: ${basinStatusCounts.map(({ label, count }) => `${label} ${count}`).join(', ')} จากทั้งหมด ${todayStatus.total}`}
          >
            {basinStatusCounts.map(({ label, count, className }) => (
              <span
                key={label}
                className={className}
                style={{ width: `${todayStatus.total ? (count / todayStatus.total) * 100 : 0}%` }}
                aria-hidden="true"
              />
            ))}
          </div> : <p className="basin-status-unavailable" role="status">
            {waypointLoadState === 'loading' ? 'กำลังโหลดผลตรวจ…' : 'โหลดผลตรวจไม่สำเร็จ'}
          </p>}
          {waypointLoadState === 'ready' && <p className="basin-status-counts" aria-label={`จำนวนสถานะวันนี้ จากทั้งหมด ${todayStatus.total}`}>
            {basinStatusCounts.map(({ label, count }, index) => (
              <span className="basin-status-count" key={label}>
                {index > 0 && <i aria-hidden="true">|</i>}
                <span>{label}: {count}</span>
              </span>
            ))}
          </p>}
        </section>

        <section className="water-criteria-card" aria-labelledby="water-criteria-title">
          <h2 id="water-criteria-title">เกณฑ์สารหนูในน้ำแม่น้ำ <span>As · ppb</span></h2>
          <div className="criteria-levels">
            <div className="criteria-level level-green"><i /><span>ปกติ</span><strong>&lt; 5</strong></div>
            <div className="criteria-level level-yellow"><i /><span>เฝ้าระวัง</span><strong>5–10</strong></div>
            <div className="criteria-level level-red"><i /><span>เกินเกณฑ์</span><strong>&gt; 10</strong></div>
          </div>
          <p>เกณฑ์ คพ. น้ำผิวดินประเภท 2: ไม่เกิน 10 ppb · 5 ppb เป็นเส้นเตือนภายใน ไม่ใช่เกณฑ์กฎหมาย</p>
          <a href="https://epo01.pcd.go.th/th/news/detail/181868" target="_blank" rel="noreferrer">แหล่งอ้างอิง: กรมควบคุมมลพิษ ↗</a>
        </section>

        <section className="time-range-card" aria-label="ช่วงเวลา">
          <span className="time-range-label">TIME RANGE</span>
          <button className="time-range-option" type="button" aria-pressed="true">
            <CalendarDays size={16} aria-hidden="true" />
            <span>วันนี้</span>
            <ChevronDown size={15} aria-hidden="true" />
          </button>
        </section>

        <div className="map-controls" aria-label="เครื่องมือแผนที่">
          <div className="map-actions" aria-label="เมนูหลัก">
            <button className="round-control" type="button" aria-label="คู่มือ" title="คู่มือ" aria-expanded={utilityPanel === 'guide'} onClick={() => { setUtilityPanel((panel) => panel === 'guide' ? null : 'guide') }}><CircleHelp size={20} /></button>
            <button className="round-control" type="button" aria-label="สรุปรายวัน" title="สรุปรายวัน" aria-expanded={utilityPanel === 'summary'} onClick={() => { setUtilityPanel((panel) => panel === 'summary' ? null : 'summary') }}><CalendarDays size={19} /></button>
            <button
              className="round-control"
              type="button"
              aria-label="ตั้งค่า"
              aria-expanded={settingsOpen}
              aria-controls="map-settings-panel"
              title="ตั้งค่า"
              onClick={() => setSettingsOpen((open) => !open)}
            ><Settings size={20} /></button>
            <button className="round-control" type="button" aria-label="Export ข้อมูล" title="Export ข้อมูล" onClick={exportWaypoints}><Download size={19} /></button>
          </div>

          {utilityPanel === 'guide' && <section className="map-utility-panel" role="region" aria-label="คู่มือการใช้งาน">
            <button type="button" className="map-utility-close" aria-label="ปิดคู่มือ" onClick={() => setUtilityPanel(null)}><X size={16} /></button>
            <h2>คู่มือการใช้งาน</h2>
            <p>ซูมแผนที่เพื่อดูพื้นที่ · เปิดตั้งค่าเพื่อโหลดเส้นทางน้ำหรือวาดพื้นที่จำลอง · กดทำแบบสำรวจเพื่อบันทึกระดับสารหนูและพิกัด</p>
            <p>พิกัด GPS และผลตรวจที่ส่งแล้วจะแสดงต่อสาธารณะบนแผนที่ ชื่อ เบอร์โทร และรูปถ่ายไม่แสดงบนแผนที่</p>
          </section>}

          {utilityPanel === 'summary' && <section className="map-utility-panel" role="region" aria-label="สรุปรายวัน">
            <button type="button" className="map-utility-close" aria-label="ปิดสรุปรายวัน" onClick={() => setUtilityPanel(null)}><X size={16} /></button>
            <h2>สรุปผลตรวจวันนี้</h2>
            {waypointLoadState === 'ready' ? <p>ทั้งหมด {todayStatus.total} จุด · วิกฤต {todayStatus.critical} · เฝ้าระวัง {todayStatus.watch} · ปกติ {todayStatus.normal}</p> : <p>{waypointLoadState === 'error' ? 'โหลดข้อมูลไม่สำเร็จ' : 'ยังไม่มีการเชื่อมต่อฐานข้อมูลผลตรวจ'}</p>}
          </section>}

          {settingsOpen && (
            <section className="map-settings-panel" id="map-settings-panel" aria-label="ตั้งค่าแผนที่">
              <header className="map-settings-header">
                <div><span className="map-settings-icon"><Waves size={17} /></span><div><strong>ชั้นข้อมูลและตัวกรอง</strong><small>ปรับมุมมองลุ่มน้ำ</small></div></div>
                <button type="button" className="map-settings-close" aria-label="ปิดตั้งค่าแผนที่" onClick={() => setSettingsOpen(false)}><X size={18} /></button>
              </header>

              <div className="map-settings-section">
                <div className="map-settings-section-title"><span>แม่น้ำและทางน้ำ</span><small>OpenStreetMap</small></div>
                <p className="map-settings-hint">เมื่อโหลด ระบบส่งเฉพาะกรอบแผนที่ปัจจุบันไปยังบริการ Overpass เพื่อค้นข้อมูลสาธารณะ</p>
                <label className="map-settings-check">
                  <input type="checkbox" checked={waterwaysVisible} onChange={(event) => setWaterwaysVisible(event.target.checked)} />
                  <span><strong>เส้นแม่น้ำและลำห้วย</strong><small>โหลดข้อมูลเมื่อกดปุ่ม · แสดงเครดิต OSM</small></span>
                </label>
                <label className="map-settings-field">เลือกแม่น้ำ
                  <select value={riverName} onChange={(event) => setRiverName(event.target.value)}>
                    {riverOptions.map((river) => <option key={river.value || 'all'} value={river.value}>{river.label}</option>)}
                  </select>
                </label>
                <button
                  type="button"
                  className="map-settings-load"
                  disabled={loadingWaterways}
                  onClick={async () => {
                    setLoadingWaterways(true)
                    setWaterwaysVisible(true)
                    setRiverLoadState('กำลังโหลดข้อมูลเส้นทางน้ำ…')
                    try {
                      const count = await mapController.current?.loadWaterways(riverName, areaMode === 'virtual' ? virtualArea : undefined)
                      setRiverLoadState(count ? `แสดงเส้นทางน้ำ ${count} เส้นในขอบเขตแผนที่` : 'ไม่พบเส้นทางน้ำชื่อนี้ในขอบเขตแผนที่ ลองเลือกแม่น้ำทุกสาย')
                    } catch (error) {
                      setRiverLoadState(error instanceof Error ? error.message : 'โหลดข้อมูลไม่สำเร็จ')
                    } finally {
                      setLoadingWaterways(false)
                    }
                  }}
                >{loadingWaterways ? 'กำลังโหลด…' : 'โหลดเส้นทางน้ำในแผนที่'}</button>
                {riverLoadState && <p className="map-settings-feedback" role="status">{riverLoadState}</p>}
              </div>

              <div className="map-settings-section">
                <div className="map-settings-section-title"><span>พื้นที่กรองข้อมูล</span><small>พื้นที่จริง / จำลอง</small></div>
                <div className="map-settings-tabs" role="group" aria-label="เลือกพื้นที่กรอง">
                  <button type="button" aria-pressed={areaMode === 'actual'} onClick={() => { setAreaMode('actual'); setDrawingArea(false) }}>พื้นที่จริง</button>
                  <button type="button" aria-pressed={areaMode === 'virtual'} onClick={() => { setAreaMode('virtual'); setDrawingArea(false) }}>พื้นที่จำลอง</button>
                </div>
                {areaMode === 'actual' ? (
                  <div className="map-settings-unavailable"><strong>ขอบเขตลุ่มน้ำทางการ</strong><span>ยังไม่มีชุดข้อมูลขอบเขตลุ่มน้ำที่ตรวจสอบแหล่งที่มาแล้ว</span></div>
                ) : (
                  <>
                    <p className="map-settings-hint">คลิกบนแผนที่อย่างน้อย 3 จุดเพื่อวาดพื้นที่ส่วนตัวชั่วคราว; เมื่อกรองจะแสดงเส้นทางน้ำที่มีจุดข้อมูลอยู่ในขอบเขต (ไม่บันทึก/ไม่ส่งออก)</p>
                    <div className="map-settings-area-actions">
                      <button type="button" aria-pressed={drawingArea} onClick={() => setDrawingArea((active) => !active)}>{drawingArea ? 'กำลังวาด · คลิกเพื่อหยุด' : 'วาดขอบเขตบนแผนที่'}</button>
                      <button type="button" onClick={() => setVirtualArea((points) => points.slice(0, -1))} disabled={!virtualArea.length}>ย้อนจุด</button>
                      <button type="button" onClick={() => { setVirtualArea([]); setDrawingArea(false) }} disabled={!virtualArea.length}>ล้าง</button>
                    </div>
                    <label className="map-settings-check map-settings-boundary">
                      <input type="checkbox" checked={showVirtualArea} onChange={(event) => setShowVirtualArea(event.target.checked)} />
                      <span><strong>แสดงขอบเขตจำลอง</strong><small>{virtualArea.length} จุด · เฉพาะในหน้านี้</small></span>
                    </label>
                  </>
                )}
              </div>

              <div className="map-settings-section map-settings-layers">
                <div className="map-settings-section-title"><span>ชั้นข้อมูลเพิ่มเติม</span></div>
                <div className="map-settings-unavailable"><strong>ทิศทาง/กระแสน้ำปัจจุบัน</strong><span>ยังไม่เชื่อมข้อมูลสถานีวัดการไหล — ไม่แสดงลูกศรจำลอง</span></div>
                <div className="map-settings-unavailable"><strong>ฝนและคุณภาพน้ำ</strong><span>ยังไม่มีแหล่งข้อมูลเชิงพื้นที่ที่พร้อมแสดงเป็นชั้นแผนที่</span></div>
              </div>
              <footer className="map-settings-footer"><Check size={13} /> พื้นที่จำลองไม่ถูกส่งขึ้นเซิร์ฟเวอร์</footer>
            </section>
          )}

          <div className="zoom-control" aria-label="ควบคุมการซูม">
            <button type="button" aria-label="ซูมเข้า" title="ซูมเข้า" onClick={() => mapController.current?.zoomIn()}><Plus size={20} /></button>
            <span />
            <button type="button" aria-label="ซูมออก" title="ซูมออก" onClick={() => mapController.current?.zoomOut()}><Minus size={20} /></button>
          </div>

        </div>

        <button className="survey-button" type="button" aria-label="ทำแบบสำรวจ" onClick={() => setSurveyOpen(true)}>
          <ClipboardList size={19} />
          <span>ทำแบบสำรวจ</span>
        </button>

        {actionFeedback && <p className="map-action-feedback" role="status" onAnimationEnd={() => setActionFeedback('')}>{actionFeedback}</p>}

        {surveyOpen && <SurveyDialog onClose={() => setSurveyOpen(false)} onWaypointCreated={handleWaypointCreated} />}
      </div>
    </main>
  )
}

export default App
