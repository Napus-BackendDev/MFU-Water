<script setup lang="ts">
import { statusMeta, type PublicationStatus } from '../utils/admin-types'

defineProps<{ status: PublicationStatus }>()
</script>

<template>
  <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="statusMeta[status].badge">
    {{ statusMeta[status].label }}
  </span>
</template>
