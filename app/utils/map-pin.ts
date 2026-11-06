// หมุดแผนที่ตัวเดียวกันที่หน้าบ้าน (KokMapPanel) และหน้าแอดมินใช้ ไอคอนจึงหน้าตาเหมือนกันทุกจุด
export const householdPinPath = '<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z"/>'

export type EditorMarker = {
  id: string
  latitude: number
  longitude: number
  color: string
  path: string
  label: string
  selected?: boolean
  dimmed?: boolean
}

export function pinIconOptions(color: string, path: string, className: string, options: { dimmed?: boolean; selected?: boolean } = {}) {
  const extra = `${options.dimmed ? ';opacity:.45' : ''}${options.selected ? ';overflow:visible' : ''}`
  const ring = options.selected ? '<circle cx="13" cy="13" r="15" fill="none" stroke="#0284C7" stroke-width="2.5"/>' : ''
  return {
    className,
    iconSize: [24, 30] as [number, number],
    iconAnchor: [12, 30] as [number, number],
    popupAnchor: [0, -27] as [number, number],
    html: `<svg width="20" height="27" viewBox="0 0 26 34" style="position:absolute;left:2px;bottom:0${extra}" aria-hidden="true">${ring}<path d="M13 1C6.4 1 1 6.4 1 13c0 8 12 20 12 20s12-12 12-20C25 6.4 19.6 1 13 1Z" fill="${color}" stroke="white" stroke-width="1.5"/><svg x="6" y="5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg></svg>`,
  }
}
