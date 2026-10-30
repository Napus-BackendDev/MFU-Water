<script setup lang="ts">
// S0 boot loading, S0.1 slow loading with retry, S0.2 overlay while a survey is being sent.
defineProps<{ variant: 'boot' | 'slow' | 'sending' }>()
const emit = defineEmits<{ (e: 'retry'): void; (e: 'skip'): void }>()

const sponsors = [
  { name: 'Australian Aid', src: '/sponsors/australian-aid.png', width: 480, height: 218 },
  { name: 'Swiss Agency for Development and Cooperation (SDC)', src: '/sponsors/sdc.png', width: 480, height: 268 },
  { name: 'Oxfam', src: '/sponsors/oxfam.png', width: 480, height: 186 },
  { name: 'มหาวิทยาลัยแม่ฟ้าหลวง', src: '/sponsors/mfu.png', width: 340, height: 480 },
]
</script>

<template>
  <!-- Sending: dimmed overlay with a card so the form behind stays visible but locked -->
  <Teleport v-if="variant === 'sending'" to="body">
    <div
      class="fixed inset-0 z-[1100] grid place-items-center bg-slate-900/65 p-4"
      role="status"
      aria-live="polite"
    >
      <div class="flex max-w-[92vw] flex-col items-center rounded-3xl bg-white px-8 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.27)] sm:px-[34px]">
        <img src="/mascot/camera.png" alt="" width="200" height="203" class="kok-mascot h-auto w-[150px] sm:w-[200px]">
        <h2 class="mb-1 mt-2.5 text-[21px] font-extrabold text-slate-900">กำลังส่งผลตรวจ…</h2>
        <p class="text-center text-sm text-slate-500">กำลังอัปโหลดรูปและบันทึกข้อมูล<br>กรุณาอย่าปิดหน้านี้</p>
        <div class="mt-4 h-2 w-56 overflow-hidden rounded-full bg-slate-300 sm:w-[280px]">
          <i class="kok-bar-fill block h-full w-[70%] rounded-full bg-sky-600" />
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Boot / slow: full screen over the app -->
  <div
    v-else
    class="fixed inset-0 z-[1100] flex flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_38%,#ffffff_0%,#eaf6fd_55%,#d7ecf8_100%)] px-4 text-center"
    role="status"
    aria-live="polite"
  >
    <img
      src="/mascot/ball.png"
      alt="มาสคอตมหาวิทยาลัยแม่ฟ้าหลวง"
      width="290"
      height="294"
      class="kok-mascot h-auto w-[210px] sm:w-[290px]"
      :class="variant === 'boot' ? 'kok-bob' : '-rotate-6'"
    >
    <div class="-mt-1.5 h-3.5 w-28 rounded-full bg-slate-900/15 blur-[3px]" />

    <template v-if="variant === 'boot'">
      <h1 class="mt-4 text-2xl font-extrabold text-slate-900 sm:text-[26px]">MFU Kok Water Watch</h1>
      <p class="mt-1 text-[15px] text-slate-500">กำลังโหลดแผนที่และข้อมูลคุณภาพน้ำ…</p>
      <div class="mt-5 h-2 w-56 overflow-hidden rounded-full bg-slate-300 sm:w-72">
        <i class="kok-bar block h-full w-1/3 rounded-full bg-sky-600" />
      </div>
    </template>

    <template v-else>
      <h1 class="mt-4 text-2xl font-extrabold text-slate-900 sm:text-[26px]">ใช้เวลานานกว่าปกติ</h1>
      <p class="mt-1 text-[15px] text-slate-500">อินเทอร์เน็ตอาจช้า หรือเซิร์ฟเวอร์ตอบสนองช้า</p>
      <button
        type="button"
        class="mt-5 inline-flex items-center justify-center rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700"
        @click="emit('retry')"
      >
        ลองใหม่
      </button>
      <button
        type="button"
        class="mt-2.5 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-50"
        @click="emit('skip')"
      >
        ดูหน้าเลือกพื้นที่ก่อน
      </button>
    </template>

    <div class="absolute inset-x-0 bottom-5 flex flex-col items-center gap-2.5 px-3.5">
      <small class="text-xs text-slate-500">ได้รับการสนับสนุนโดย</small>
      <ul class="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <li v-for="sponsor in sponsors" :key="sponsor.name" class="flex h-10 items-center sm:h-12">
          <img :src="sponsor.src" :alt="sponsor.name" :width="sponsor.width" :height="sponsor.height" class="h-full w-auto max-w-[120px] object-contain sm:max-w-[160px]">
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
/* The mascot PNG has a white backdrop; multiply blends it into the gradient. */
.kok-mascot { mix-blend-mode: multiply; }
.kok-bob { animation: kok-bob 1.6s ease-in-out infinite; }
.kok-bar { animation: kok-bar 1.3s ease-in-out infinite; }
.kok-bar-fill { animation: kok-pulse 1.4s ease-in-out infinite; }
@keyframes kok-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
@keyframes kok-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-16px); } }
@keyframes kok-bar { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
@media (prefers-reduced-motion: reduce) {
  .kok-bob, .kok-bar, .kok-bar-fill { animation: none; }
}
</style>
