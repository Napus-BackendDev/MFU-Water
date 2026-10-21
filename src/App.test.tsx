import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const mapMocks = vi.hoisted(() => ({
  mapOptions: null as unknown,
  tileOptions: null as unknown,
  tileUrl: '',
  controlOptions: null as unknown,
  attribution: '',
  map: null as null | { flyTo: ReturnType<typeof vi.fn>; zoomIn: ReturnType<typeof vi.fn>; zoomOut: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> },
  tileLayer: null as null | { addTo: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn> },
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
  flyTo: vi.fn(),
  remove: vi.fn(),
  layerAddTo: vi.fn(),
  layerRemove: vi.fn(),
  layerClear: vi.fn(),
  polylineAddTo: vi.fn(),
  polygonAddTo: vi.fn(),
  mapOn: vi.fn(),
  polygonRemove: vi.fn(),
  circleMarkerAddTo: vi.fn(),
  bindPopup: vi.fn(),
  lastCircleMarker: null as unknown,
  lastPolyline: null as unknown,
}))

vi.mock('leaflet', () => {
  const map = {
    flyTo: mapMocks.flyTo,
    zoomIn: mapMocks.zoomIn,
    zoomOut: mapMocks.zoomOut,
    getBounds: vi.fn(() => ({ getSouth: () => 20, getWest: () => 99.8, getNorth: () => 20.1, getEast: () => 99.9 })),
    on: mapMocks.mapOn,
    remove: mapMocks.remove,
  }
  const tileLayer = { addTo: vi.fn(), on: vi.fn() }
  const layerGroup = { addTo: mapMocks.layerAddTo, remove: mapMocks.layerRemove, clearLayers: mapMocks.layerClear }
  const polyline = { addTo: mapMocks.polylineAddTo }
  const polygon = { addTo: mapMocks.polygonAddTo, remove: mapMocks.polygonRemove }
  const circleMarker = { addTo: mapMocks.circleMarkerAddTo, bindPopup: mapMocks.bindPopup }
  tileLayer.addTo.mockReturnValue(tileLayer)
  return {
    default: {
      map: vi.fn((_container: HTMLElement, options: unknown) => {
        mapMocks.mapOptions = options
        mapMocks.map = map
        return map
      }),
      tileLayer: vi.fn((url: string, options: unknown) => {
        mapMocks.tileUrl = url
        mapMocks.tileOptions = options
        mapMocks.tileLayer = tileLayer
        return tileLayer
      }),
      layerGroup: vi.fn(() => layerGroup),
      polyline: vi.fn((positions: unknown, options: unknown) => {
        mapMocks.lastPolyline = { positions, options }
        return polyline
      }),
      polygon: vi.fn(() => polygon),
      circleMarker: vi.fn((position: unknown, options: unknown) => {
        mapMocks.lastCircleMarker = { position, options }
        return circleMarker
      }),
      control: {
        attribution: vi.fn((options: unknown) => {
          mapMocks.controlOptions = options
          return { addTo: vi.fn() }
        }),
      },
    },
  }
})

describe('map controls UI', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
  beforeEach(() => {
    mapMocks.mapOptions = null
    mapMocks.tileOptions = null
    mapMocks.tileUrl = ''
    mapMocks.controlOptions = null
    mapMocks.map = null
    mapMocks.tileLayer = null
    mapMocks.zoomIn.mockClear()
    mapMocks.zoomOut.mockClear()
    mapMocks.flyTo.mockClear()
    mapMocks.remove.mockClear()
    mapMocks.layerAddTo.mockClear()
    mapMocks.layerRemove.mockClear()
    mapMocks.layerClear.mockClear()
    mapMocks.polylineAddTo.mockClear()
    mapMocks.polygonAddTo.mockClear()
    mapMocks.mapOn.mockClear()
    mapMocks.polygonRemove.mockClear()
    mapMocks.lastPolyline = null
    mapMocks.lastCircleMarker = null
    mapMocks.circleMarkerAddTo.mockClear()
    mapMocks.bindPopup.mockClear()
  })

  it('shows a full-screen map with the requested right-side controls and no navigation or sidebar', async () => {
    render(<App mapKey="" />)

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'แผนที่ดาวเทียม Leaflet' })).toBeInTheDocument()
    expect(document.querySelector('iframe')).not.toBeInTheDocument()

    const menuButtons = Array.from(document.querySelectorAll('.map-actions button')).map((button) => button.getAttribute('aria-label'))
    expect(menuButtons).toEqual(['คู่มือ', 'สรุปรายวัน', 'ตั้งค่า', 'Export ข้อมูล'])
    expect(screen.getByRole('button', { name: 'ซูมเข้า' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ซูมออก' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ดูพื้นที่ปัจจุบัน' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ทำแบบสำรวจ' })).toBeInTheDocument()
  })

  it('initializes MapTiler Satellite via Leaflet, keeps attribution bottom-left, and connects zoom buttons', async () => {
    render(<App mapKey="test-public-key" />)

    await waitFor(() => expect(mapMocks.mapOptions).not.toBeNull())
    expect(mapMocks.mapOptions).toMatchObject({
      center: [20.0451, 99.8912],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    })
    expect(mapMocks.tileUrl).toBe('https://api.maptiler.com/maps/satellite-v4/{z}/{x}/{y}.jpg?key=test-public-key')
    expect(mapMocks.tileOptions).toMatchObject({ tileSize: 512, zoomOffset: -1, maxNativeZoom: 20 })
    expect(mapMocks.controlOptions).toEqual({ position: 'bottomleft', prefix: false })
    expect(screen.getByRole('link', { name: 'MapTiler' })).toHaveAttribute('href', 'https://www.maptiler.com/')

    fireEvent.click(screen.getByRole('button', { name: 'ซูมเข้า' }))
    fireEvent.click(screen.getByRole('button', { name: 'ซูมออก' }))
    expect(mapMocks.zoomIn).toHaveBeenCalledOnce()
    expect(mapMocks.zoomOut).toHaveBeenCalledOnce()
  })

  it('renders Esri satellite imagery without a MapTiler key and does not fall back to Google', async () => {
    render(<App mapKey="" />)

    await waitFor(() => expect(mapMocks.tileUrl).toContain('server.arcgisonline.com/ArcGIS/rest/services/World_Imagery'))
    expect(mapMocks.mapOptions).not.toBeNull()
    expect(mapMocks.tileOptions).toMatchObject({ attribution: expect.stringContaining('Source: Esri'), maxNativeZoom: 19 })
    expect(mapMocks.tileOptions).not.toHaveProperty('tileSize')
    expect(mapMocks.tileOptions).not.toHaveProperty('zoomOffset')
    expect(document.querySelector('iframe')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'MapTiler' })).not.toBeInTheDocument()
  })

  it('does not show fabricated basin counts when the server data endpoint is unavailable', async () => {
    render(<App mapKey="" />)

    expect(screen.getByRole('heading', { name: 'สถานการณ์ลุ่มน้ำวันนี้' })).toBeInTheDocument()
    expect(await screen.findByText('โหลดผลตรวจไม่สำเร็จ')).toBeInTheDocument()
    expect(screen.queryByText('วิกฤต: 37')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /เกณฑ์สารหนูในน้ำแม่น้ำ/ })).toBeInTheDocument()
    expect(screen.getByText('< 5')).toBeInTheDocument()
    expect(screen.getByText('5–10')).toBeInTheDocument()
    expect(screen.getByText('> 10')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /กรมควบคุมมลพิษ/ })).toHaveAttribute(
      'href',
      'https://epo01.pcd.go.th/th/news/detail/181868',
    )
  })

  it('shows today as the selected time-range mockup without adding date behavior', () => {
    render(<App mapKey="" />)

    expect(screen.getByRole('region', { name: 'ช่วงเวลา' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'วันนี้' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('loads a selected OSM waterway and switches to a client-only virtual area', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ elements: [{ tags: { name: 'Kok River', waterway: 'river' }, geometry: [{ lat: 20.01, lon: 99.81 }, { lat: 20.02, lon: 99.82 }] }] }),
    }))
    render(<App mapKey="" />)

    fireEvent.click(screen.getByRole('button', { name: 'ตั้งค่า' }))
    expect(screen.getByRole('region', { name: 'ตั้งค่าแผนที่' })).toBeInTheDocument()
    expect(screen.getByText(/ยังไม่เชื่อมข้อมูลสถานีวัดการไหล/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'โหลดเส้นทางน้ำในแผนที่' }))
    await waitFor(() => expect(mapMocks.lastPolyline).not.toBeNull())
    expect(fetch).toHaveBeenCalledWith('https://overpass-api.de/api/interpreter', expect.objectContaining({ method: 'POST' }))
    expect(mapMocks.layerClear).toHaveBeenCalledOnce()
    expect(await screen.findByText(/แสดงเส้นทางน้ำ 1 เส้น/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'พื้นที่จำลอง' }))
    expect(screen.getByRole('button', { name: 'วาดขอบเขตบนแผนที่' })).toBeInTheDocument()
    expect(screen.getByText(/ไม่บันทึก\/ไม่ส่งออก/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'ปิดตั้งค่าแผนที่' }))
    expect(screen.queryByRole('region', { name: 'ตั้งค่าแผนที่' })).not.toBeInTheDocument()
  })

  it('opens and closes the survey form with the requested collection fields', () => {
    render(<App mapKey="" />)

    fireEvent.click(screen.getByRole('button', { name: 'ทำแบบสำรวจ' }))
    expect(screen.getByRole('dialog', { name: 'ทำแบบสำรวจ' })).toBeInTheDocument()
    expect(screen.getByLabelText('ชื่อ-นามสกุล / Full Name')).toBeInTheDocument()
    expect(screen.getByLabelText('เบอร์โทรศัพท์ / Phone Number')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(9)
    expect(screen.getByRole('button', { name: 'กดปุ่มเพื่อพิกัด GPS ปัจจุบัน' })).toBeInTheDocument()
    expect(screen.getByLabelText('ละติจูด')).toHaveAttribute('placeholder', 'ยังไม่ทราบ')
    expect(screen.getByLabelText('ลองจิจูด')).toHaveAttribute('placeholder', 'ยังไม่ทราบ')
    expect(screen.getByLabelText('เลือกภาพที่ 1')).toBeInTheDocument()
    expect(screen.getByLabelText('เลือกภาพที่ 2')).toBeInTheDocument()
    expect(screen.queryByLabelText('วันที่สำรวจ')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ส่งข้อมูลบันทึก' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'ปิดหน้าต่าง' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('requires consent before publishing survey location and result', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: vi.fn((success: PositionCallback) => success({
        coords: { latitude: 20.0451, longitude: 99.8912, accuracy: 8 } as GeolocationCoordinates,
      } as GeolocationPosition)) },
    })
    render(<App mapKey="" />)
    fireEvent.click(screen.getByRole('button', { name: 'ทำแบบสำรวจ' }))
    fireEvent.click(screen.getByRole('radio', { name: '1: 0 ppb' }))
    fireEvent.click(screen.getByRole('button', { name: 'กดปุ่มเพื่อพิกัด GPS ปัจจุบัน' }))
    await waitFor(() => expect(screen.getByLabelText('ละติจูด')).toHaveValue(20.0451))
    fireEvent.click(screen.getByRole('button', { name: 'ส่งข้อมูลบันทึก' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('กรุณายินยอมเผยแพร่พิกัด GPS และผลตรวจ')
  })

  it('opens help and daily summary panels', async () => {
    render(<App mapKey="" />)

    fireEvent.click(screen.getByRole('button', { name: 'คู่มือ' }))
    expect(screen.getByRole('region', { name: 'คู่มือการใช้งาน' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'ปิดคู่มือ' }))
    fireEvent.click(screen.getByRole('button', { name: 'สรุปรายวัน' }))
    expect(await screen.findByRole('region', { name: 'สรุปรายวัน' })).toHaveTextContent('โหลดข้อมูลไม่สำเร็จ')
    fireEvent.click(screen.getByRole('button', { name: 'คู่มือ' }))
    expect(screen.queryByRole('region', { name: 'สรุปรายวัน' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'คู่มือ' }))
    expect(screen.queryByRole('region', { name: 'คู่มือการใช้งาน' })).not.toBeInTheDocument()
  })

  it('accepts zero manual coordinates and rejects a cleared coordinate', () => {
    render(<App mapKey="" />)
    fireEvent.click(screen.getByRole('button', { name: 'ทำแบบสำรวจ' }))
    fireEvent.click(screen.getByRole('radio', { name: '1: 0 ppb' }))
    fireEvent.change(screen.getByLabelText('ละติจูด'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('ลองจิจูด'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'ส่งข้อมูลบันทึก' }))
    expect(screen.getByRole('alert')).toHaveTextContent('กรุณายินยอมเผยแพร่')
    fireEvent.change(screen.getByLabelText('ละติจูด'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'ส่งข้อมูลบันทึก' }))
    expect(screen.getByRole('alert')).toHaveTextContent('กรุณาบันทึกพิกัด GPS ปัจจุบัน')
  })

  it('reports when export has no real waypoint data', () => {
    render(<App mapKey="" />)

    fireEvent.click(screen.getByRole('button', { name: 'Export ข้อมูล' }))
    expect(screen.getByText('ยังไม่มีผลตรวจให้ส่งออก')).toHaveAttribute('role', 'status')
  })

  it('centers the map on the browser geolocation when available', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success: PositionCallback) => success({
          coords: { latitude: 13.7563, longitude: 100.5018 } as GeolocationCoordinates,
        } as GeolocationPosition)),
      },
    })

    render(<App mapKey="test-public-key" />)

    await waitFor(() => expect(mapMocks.flyTo).toHaveBeenCalledWith([13.7563, 100.5018]))
  })
})
