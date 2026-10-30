import { computed, ref, watch, type Ref } from 'vue'
import { arsenicSeverity, type AdminSample, type PublicationStatus } from '../utils/admin-types'

export type SampleTab = 'all' | PublicationStatus
export type SeverityFilter = 'all' | 'safe' | 'watch' | 'critical'

// Tab, severity and text filters plus pagination over the admin sample list.
export function useSampleFilters(samples: Ref<AdminSample[]>) {
  const tab = ref<SampleTab>('all')
  const severity = ref<SeverityFilter>('all')
  const query = ref('')
  const page = ref(1)
  const pageSize = ref(10)

  const filtered = computed(() => {
    const q = query.value.trim().toLowerCase()
    return samples.value.filter((item) => {
      if (tab.value !== 'all' && item.publication_status !== tab.value) return false
      if (severity.value !== 'all' && arsenicSeverity(item.arsenic_ppb) !== severity.value) return false
      if (!q) return true
      return [item.sample_code, item.contact_name, item.contact_phone, item.station_name, String(item.arsenic_ppb), item.sample_nature?.water_source]
        .some((value) => (value || '').toLowerCase().includes(q))
    })
  })
  const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
  const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))

  watch([tab, severity, query, pageSize], () => { page.value = 1 })

  return { tab, severity, query, page, pageSize, filtered, totalPages, paged }
}
