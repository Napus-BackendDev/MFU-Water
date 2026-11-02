<script setup lang="ts">
import { statusMeta, type PublicationStatus } from '../utils/admin-types'

defineProps<{ status: PublicationStatus }>()
</script>

<template>
  <span class="inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold" :class="statusMeta[status].badge">
    {{ statusMeta[status].label }}
  </span>
</template>
