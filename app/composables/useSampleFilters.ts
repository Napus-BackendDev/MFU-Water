import { computed, ref, watch, type Ref } from 'vue'
import { arsenicSeverity, type AdminSample, type PublicationStatus } from '../utils/admin-types'

export type SampleTab = 'all' | PublicationStatus
export type SeverityFilter = 'all' | 'normal' | 'watch' | 'over'
export type TimeRangeFilter = 'all' | '24h' | '7d' | '30d'
export type TimeOrder = 'desc' | 'asc'

function sampleTimeMs(item: AdminSample): number {
  const ms = Date.parse(item.collection_time || item.created_at || '')
  return Number.isFinite(ms) ? ms : Number.NaN
}

// Tab, severity, time range, time order, and text filters plus pagination over the admin sample list.
export function useSampleFilters(samples: Ref<AdminSample[]>) {
  const tab = ref<SampleTab>('all')
  const severity = ref<SeverityFilter>('all')
  const timeRange = ref<TimeRangeFilter>('all')
  const timeOrder = ref<TimeOrder>('desc')
  const query = ref('')
  const page = ref(1)
  const pageSize = ref(10)

  const toggleTimeOrder = () => {
    timeOrder.value = timeOrder.value === 'desc' ? 'asc' : 'desc'
  }

  const filtered = computed(() => {
    const q = query.value.trim().toLowerCase()
    const nowMs = Date.now()
    const matched = samples.value.filter((item) => {
      if (tab.value !== 'all') {
        if (tab.value === 'approved' || tab.value === 'auto_published') {
          if (item.publication_status !== 'approved' && item.publication_status !== 'auto_published') return false
        } else if (item.publication_status !== tab.value) {
          return false
        }
      }
      if (severity.value !== 'all' && arsenicSeverity(item.arsenic_ppb) !== severity.value) return false
      if (timeRange.value !== 'all') {
        const createdMs = sampleTimeMs(item)
        if (!Number.isFinite(createdMs)) return false
        const ageHours = (nowMs - createdMs) / (1000 * 3600)
        if (timeRange.value === '24h' && ageHours > 24) return false
        if (timeRange.value === '7d' && ageHours > 24 * 7) return false
        if (timeRange.value === '30d' && ageHours > 24 * 30) return false
      }
      if (!q) return true
      return [item.sample_code, item.contact_name, item.contact_phone, item.station_name, String(item.arsenic_ppb), item.sample_nature?.water_source, item.sample_nature?.test_kit, `${item.latitude},${item.longitude}`]
        .some((value) => (value || '').toLowerCase().includes(q))
    })

    return matched.sort((a, b) => {
      const aMs = sampleTimeMs(a)
      const bMs = sampleTimeMs(b)
      const aValid = Number.isFinite(aMs)
      const bValid = Number.isFinite(bMs)
      if (aValid && bValid && aMs !== bMs) {
        return timeOrder.value === 'desc' ? bMs - aMs : aMs - bMs
      }
      if (aValid !== bValid) return aValid ? -1 : 1
      const aCreated = Date.parse(a.created_at || '')
      const bCreated = Date.parse(b.created_at || '')
      if (Number.isFinite(aCreated) && Number.isFinite(bCreated) && aCreated !== bCreated) {
        return timeOrder.value === 'desc' ? bCreated - aCreated : aCreated - bCreated
      }
      return a.sample_code.localeCompare(b.sample_code)
    })
  })
  const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
  const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))

  watch([tab, severity, timeRange, timeOrder, query, pageSize], () => { page.value = 1 })

  return { tab, severity, timeRange, timeOrder, toggleTimeOrder, query, page, pageSize, filtered, totalPages, paged }
}
