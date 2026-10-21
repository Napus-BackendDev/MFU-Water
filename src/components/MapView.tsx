import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import L, { type Map as LeafletMap } from 'leaflet'
import { satelliteTileConfig } from '../lib/map-tiler'
import type { SurveyCoordinates, SurveyWaypoint } from '../lib/survey'
import { clusterSurveyWaypoints } from '../lib/waypoints'
import 'leaflet/dist/leaflet.css'

export type MapCoordinates = SurveyCoordinates

export type MapController = {
  zoomIn: () => void
  zoomOut: () => void
  loadWaterways: (riverName: string, virtualArea?: MapCoordinates[]) => Promise<number>
  focusOnWaypoint: (waypoint: SurveyWaypoint) => void
}

type MapViewProps = {
  apiKey: string
  coordinates: MapCoordinates
  waterwaysVisible: boolean
  drawingArea: boolean
  showVirtualArea: boolean
  virtualArea: MapCoordinates[]
  onMapClick: (coordinate: MapCoordinates) => void
  waypoints: SurveyWaypoint[]
}

const MapView = forwardRef<MapController, MapViewProps>(function MapView({ apiKey, coordinates, waterwaysVisible, drawingArea, showVirtualArea, virtualArea, onMapClick, waypoints }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const initialCenter = useRef<[number, number]>([coordinates.longitude, coordinates.latitude])
  const lastCoordinates = useRef({ latitude: coordinates.latitude, longitude: coordinates.longitude })
  const drawingRef = useRef(drawingArea)
  const mapClickRef = useRef(onMapClick)
  const waterwaysRef = useRef<L.LayerGroup | null>(null)
  const virtualAreaLayerRef = useRef<L.Polygon | null>(null)
  const waypointLayerRef = useRef<L.LayerGroup | null>(null)
  const lastWaterwayRequestAt = useRef(0)
  const latitude = coordinates.latitude
  const longitude = coordinates.longitude
  const [mapError, setMapError] = useState(false)


  useEffect(() => {
    drawingRef.current = drawingArea
    mapClickRef.current = onMapClick
  }, [drawingArea, onMapClick])

  useImperativeHandle(ref, () => ({
    zoomIn: () => mapRef.current?.zoomIn(),
    zoomOut: () => mapRef.current?.zoomOut(),
    loadWaterways: async (riverName: string, area?: MapCoordinates[]) => {
      const map = mapRef.current
      const layer = waterwaysRef.current
      if (!map || !layer) throw new Error('แผนที่ยังไม่พร้อม')
      if (Date.now() - lastWaterwayRequestAt.current < 30_000) throw new Error('ขอข้อมูลซ้ำเร็วเกินไป โปรดลองอีกครั้งใน 30 วินาที')

      const bounds = map.getBounds()
      const south = bounds.getSouth()
      const west = bounds.getWest()
      const north = bounds.getNorth()
      const east = bounds.getEast()
      if (north - south > 0.3 || east - west > 0.3) throw new Error('กรุณาซูมเข้าให้ใกล้พื้นที่ (กรอบแผนที่ไม่เกิน 0.3°) ก่อนโหลดเส้นทางน้ำ')
      if (area && area.length < 3) throw new Error('วาดพื้นที่จำลองอย่างน้อย 3 จุดก่อนกรองเส้นทางน้ำ')

      lastWaterwayRequestAt.current = Date.now()
      const query = `[out:json][timeout:20];way["waterway"~"river|stream|canal"](${south},${west},${north},${east});out geom;`
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: `data=${encodeURIComponent(query)}`,
      })
      if (!response.ok) throw new Error(response.status === 429 ? 'บริการข้อมูลแม่น้ำมีคำขอมาก โปรดรอ 30 วินาทีแล้วลองใหม่' : `โหลดเส้นทางน้ำไม่สำเร็จ (${response.status})`)
      const data = await response.json() as { elements?: Array<{ geometry?: Array<{ lat: number; lon: number }>; tags?: { name?: string; waterway?: string } }> }
      const nameNeedle = riverName.trim().toLocaleLowerCase()
      const elements = (data.elements ?? []).filter((element) => element.geometry && element.geometry.length > 1 && (!nameNeedle || element.tags?.name?.toLocaleLowerCase().includes(nameNeedle)))
      layer.clearLayers()
      let displayedCount = 0
      elements.forEach((element) => {
        const isRiver = element.tags?.waterway === 'river'
        const positions = element.geometry!.map(({ lat, lon }) => ({ latitude: lat, longitude: lon }))
        const visiblePositions = area ? positions.filter((point) => isInsideArea(point, area)) : positions
        if (visiblePositions.length < 2) return
        L.polyline(visiblePositions.map(({ latitude: lat, longitude: lon }) => [lat, lon] as L.LatLngExpression), {
          color: isRiver ? '#54d7cd' : '#75c6d8',
          weight: isRiver ? 4 : 2.5,
          opacity: 0.9,
        }).addTo(layer)
        displayedCount += 1
      })
      return displayedCount
    },
    focusOnWaypoint: (waypoint: SurveyWaypoint) => mapRef.current?.flyTo([waypoint.latitude, waypoint.longitude], 16),
  }), [])

  useEffect(() => {
    const key = apiKey.trim()
    if (!containerRef.current) return

    setMapError(false)
    const tiles = satelliteTileConfig(key)
    const map = L.map(containerRef.current, {
      center: [initialCenter.current[1], initialCenter.current[0]],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    })
    mapRef.current = map
    waterwaysRef.current = L.layerGroup()
    waypointLayerRef.current = L.layerGroup().addTo(map)
    map.on('click', (event: L.LeafletMouseEvent) => {
      if (drawingRef.current) mapClickRef.current({ latitude: event.latlng.lat, longitude: event.latlng.lng })
    })
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map)
    const tileOptions = {
      attribution: tiles.attribution,
      maxZoom: tiles.maxZoom,
      maxNativeZoom: tiles.maxNativeZoom,
      crossOrigin: true,
      ...(tiles.tileSize !== undefined ? { tileSize: tiles.tileSize, zoomOffset: tiles.zoomOffset } : {}),
    }
    const tileLayer = L.tileLayer(tiles.url, tileOptions).addTo(map)
    tileLayer.on('tileerror', () => setMapError(true))
    tileLayer.on('load', () => setMapError(false))

    return () => {
      mapRef.current = null
      waterwaysRef.current = null
      waypointLayerRef.current = null
      virtualAreaLayerRef.current = null
      map.remove()
    }
  }, [apiKey])

  useEffect(() => {
    const previous = lastCoordinates.current
    if (previous.latitude !== latitude || previous.longitude !== longitude) {
      mapRef.current?.flyTo([latitude, longitude])
      lastCoordinates.current = { latitude, longitude }
    }
  }, [latitude, longitude])

  useEffect(() => {
    const layer = waypointLayerRef.current
    if (!layer) return
    layer.clearLayers()
    for (const cluster of clusterSurveyWaypoints(waypoints)) {
      const level = cluster.latest.arsenic_level_ppb
      const color = level > 10 ? '#d84b45' : level >= 5 ? '#e4aa36' : '#3a9c75'
      const marker = L.circleMarker([cluster.latitude, cluster.longitude], {
        radius: cluster.sampleCount > 1 ? 10 : 8,
        color: '#fff',
        weight: 2,
        fillColor: color,
        fillOpacity: 0.95,
      })
      const summary = cluster.sampleCount > 1
        ? `<br>${cluster.sampleCount} จุด · เฉลี่ย ${cluster.averagePpb.toFixed(1)} ppb · ช่วง ${cluster.minPpb}–${cluster.maxPpb} ppb`
        : ''
      const accuracy = cluster.latest.gps_accuracy_meters === null ? '' : `<br>ความแม่นยำ GPS ±${cluster.latest.gps_accuracy_meters} ม.`
      marker.bindPopup(`<strong>${cluster.latest.sample_code}</strong><br>สารหนู ${level} ppb<br>${new Date(cluster.latest.created_at).toLocaleString('th-TH')}${accuracy}${summary}`)
      marker.addTo(layer)
    }
  }, [waypoints])

  useEffect(() => {
    const map = mapRef.current
    const waterways = waterwaysRef.current
    if (!map || !waterways) return
    if (waterwaysVisible) waterways.addTo(map)
    else waterways.remove()
    const attribution = map.attributionControl
    const credit = 'เส้นทางน้ำ © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors (ODbL)</a>'
    if (waterwaysVisible) attribution?.addAttribution(credit)
    else attribution?.removeAttribution(credit)
  }, [waterwaysVisible])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    virtualAreaLayerRef.current?.remove()
    virtualAreaLayerRef.current = null
    if (showVirtualArea && virtualArea.length >= 3) {
      virtualAreaLayerRef.current = L.polygon(virtualArea.map(({ latitude: lat, longitude: lon }) => [lat, lon] as L.LatLngExpression), {
        color: '#f4b942',
        weight: 3,
        fillColor: '#f4b942',
        fillOpacity: 0.18,
        dashArray: '7 6',
      }).addTo(map)
    }
  }, [showVirtualArea, virtualArea])

  return (
    <section className="map-view" aria-label="แผนที่ดาวเทียม Leaflet">
      <div className="leaflet-container-host" ref={containerRef} />
      {mapError && (
        <div className="map-load-error" role="status">
          โหลดภาพดาวเทียมจาก {apiKey.trim() ? 'MapTiler' : 'Esri'} ไม่สำเร็จ โปรดตรวจการเชื่อมต่อ
        </div>
      )}
      {apiKey.trim() && (
        <a
          className="maptiler-logo"
          href="https://www.maptiler.com/"
          target="_blank"
          rel="noreferrer"
          aria-label="MapTiler"
        >
          <img src="https://api.maptiler.com/resources/logo.svg" alt="MapTiler logo" />
        </a>
      )}
    </section>
  )
})

function isInsideArea(point: MapCoordinates, area: MapCoordinates[]) {
  let inside = false
  for (let index = 0, previous = area.length - 1; index < area.length; previous = index, index += 1) {
    const currentPoint = area[index]
    const previousPoint = area[previous]
    const crosses = (currentPoint.latitude > point.latitude) !== (previousPoint.latitude > point.latitude)
      && point.longitude < ((previousPoint.longitude - currentPoint.longitude) * (point.latitude - currentPoint.latitude))
        / (previousPoint.latitude - currentPoint.latitude) + currentPoint.longitude
    if (crosses) inside = !inside
  }
  return inside
}

export default MapView
