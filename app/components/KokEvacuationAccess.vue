<script setup lang="ts">
import { ref } from 'vue'
import { LockKeyhole } from 'lucide-vue-next'
import type { RestrictedEvacuation } from '../utils/restricted-evacuation'

const emit = defineEmits<{ loaded: [data: RestrictedEvacuation] }>()
const expanded = ref(false)
const accessKey = ref('')
const loading = ref(false)
const error = ref('')

async function unlock() {
  if (loading.value) return
  const key = accessKey.value.trim()
  if (!/^[a-f0-9]{64}$/.test(key)) {
    error.value = 'รหัสไม่ถูกต้อง กรุณาใช้รหัสที่ผู้ดูแลให้'
    accessKey.value = ''
    return
  }
  loading.value = true
  error.value = ''
  try {
    const response = await fetch('/api/evacuation/restricted', {
      headers: { Authorization: `Bearer ${key}` }, cache: 'no-store', credentials: 'omit',
    })
    if (!response.ok) {
      error.value = response.status === 401 ? 'รหัสไม่ถูกต้อง กรุณาตรวจรหัสแล้วลองอีกครั้ง' : 'ข้อมูลยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ'
      return
    }
    const data = await response.json() as RestrictedEvacuation
    if (data.visibility !== 'restricted' || !Array.isArray(data.points) || !Array.isArray(data.routes)) throw new Error('Invalid response')
    emit('loaded', data)
  } catch {
    error.value = 'โหลดข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง'
  } finally {
    accessKey.value = ''
    loading.value = false
  }
}
</script>

<template>
  <section class="evacuation-access" aria-label="เปิดข้อมูลจำกัดสิทธิ์">
    <button v-if="!expanded" type="button" class="access-button" @click="expanded = true">
      <LockKeyhole :size="14" aria-hidden="true" />เปิดข้อมูลกลุ่มเปราะบาง
    </button>
    <form v-else @submit.prevent="unlock">
      <label for="evacuation-access-key">รหัสเข้าถึงข้อมูล</label>
      <input id="evacuation-access-key" v-model="accessKey" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" :disabled="loading" required :aria-invalid="!!error" :aria-describedby="error ? 'evacuation-access-error' : undefined" />
      <button type="submit" class="access-button" :disabled="loading || !accessKey.trim()">{{ loading ? 'กำลังเปิด…' : 'เปิดข้อมูล' }}</button>
      <p v-if="error" id="evacuation-access-error" role="alert">{{ error }}</p>
    </form>
  </section>
</template>

<style scoped>
.evacuation-access { margin-top:8px; padding-top:8px; border-top:1px solid #94a3b844; pointer-events:auto; max-width:210px; }
label { display:block; margin-bottom:5px; }
input { width:100%; min-height:40px; border:1px solid #94a3b8; border-radius:8px; padding:6px 8px; background:var(--wv-card,white); color:var(--wv-text,#0f172a); }
.access-button { display:flex; align-items:center; justify-content:center; gap:6px; min-height:40px; width:100%; padding:6px 10px; border:1px solid #94a3b8; border-radius:8px; color:var(--wv-text,#0f172a); cursor:pointer; }
form .access-button { margin-top:6px; }
.access-button:hover { background:#94a3b822; }
:where(input,button):focus-visible { outline:2px solid #386ca9; outline-offset:2px; }
button:disabled { opacity:.55; cursor:wait; }
p { margin:6px 0 0; color:#b91c1c; line-height:1.5; }
</style>
