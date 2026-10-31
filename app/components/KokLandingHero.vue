<script setup lang="ts">
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Newspaper,
  Sparkles,
  Waves,
} from 'lucide-vue-next'
import type { CommunityTarget } from '../utils/kok-contract'

defineProps<{
  communities: CommunityTarget[]
}>()

const emit = defineEmits<{
  (e: 'select-community', id: 'all' | 'thaton' | 'ruammit' | 'pongkhong' | 'pakingtai'): void
  (e: 'selectCommunity', id: 'all' | 'thaton' | 'ruammit' | 'pongkhong' | 'pakingtai'): void
  (e: 'enter-dashboard'): void
  (e: 'enterDashboard'): void
  (e: 'open-news'): void
  (e: 'openNews'): void
}>()

function onSelect(id: 'all' | 'thaton' | 'ruammit' | 'pongkhong' | 'pakingtai') {
  emit('select-community', id)
  emit('selectCommunity', id)
}

const communityRoleBadges: Record<string, { role: string; riverPart: string; color: string }> = {
  thaton: { role: 'ต้นน้ำกก · มีชุดสำรวจ 129 ครัวเรือน', riverPart: 'ต้นน้ำ (เชียงใหม่)', color: '#32D74B' },
  ruammit: { role: 'กลางน้ำกก · เส้นทางล่องแพท่องเที่ยว', riverPart: 'กลางน้ำ (เชียงราย)', color: '#00E5FF' },
  pongkhong: { role: 'ปลายน้ำกก · จุดบรรจบแม่น้ำโขง', riverPart: 'ปลายน้ำ (เชียงแสน)', color: '#98A2A8' },
  pakingtai: { role: 'จุดสบแม่น้ำอิงกับแม่น้ำโขง', riverPart: 'ปลายน้ำ (เชียงของ)', color: '#00E5FF' },
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#121212] dark:text-white flex flex-col justify-between selection:bg-[#00E5FF] selection:text-[#081316]">
    <!-- Top Bar: Telemetry Status & System Kicker -->
    <header class="border-b border-slate-200 bg-white/90 dark:border-[#2C2C2E] dark:bg-[#1E1E1E]/90 px-4 py-3.5 backdrop-blur-md lg:px-8">
      <div class="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00E5FF]/10 text-[#0284C7] dark:text-[#00E5FF] border border-[#00E5FF]/20 shadow-[0_0_12px_rgba(0,229,255,0.15)]">
            <Waves class="h-5 w-5" />
          </div>
          <div>
            <div class="text-[10px] font-bold tracking-widest text-[#0284C7] dark:text-[#00E5FF] uppercase wv-mono">
              MFU KOK WATER WATCH · TELEMETRY PORTAL
            </div>
            <h1 class="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">
              ระบบติดตามคุณภาพน้ำแม่น้ำกกและข้อมูลชุมชนต้นแบบ
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            class="wv-btn-secondary flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3.5 rounded-xl border border-slate-200 bg-white/95 dark:border-[#2C2C2E] dark:bg-[#1E1E1E]/95 text-slate-700 dark:text-slate-200 hover:border-[#0284C7] dark:hover:border-[#00E5FF] transition cursor-pointer"
            @click="emit('openNews')"
          >
            <Newspaper class="h-3.5 w-3.5 text-[#0284C7] dark:text-[#00E5FF]" />
            <span>ข่าวสารประชาสัมพันธ์</span>
          </button>
          <button
            type="button"
            class="wv-btn-primary flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3.5"
            @click="emit('enterDashboard')"
          >
            <span>เข้าสู่ระบบติดตาม</span>
            <ArrowRight class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content: Hero & 4 Community Focus Grid -->
    <main class="mx-auto max-w-[1440px] px-4 py-10 lg:px-8 w-full flex-1 flex flex-col justify-center">
      <!-- Hero Headline -->
      <div class="max-w-3xl mb-8">
        <div class="inline-flex items-center gap-1.5 rounded-full border border-[#0284C7]/20 bg-[#0284C7]/10 dark:border-[#00E5FF]/25 dark:bg-[#00E5FF]/10 px-3 py-1 text-xs font-medium text-[#0284C7] dark:text-[#00E5FF] mb-3">
          <Sparkles class="h-3.5 w-3.5" />
          <span>4 TARGET COMMUNITIES · REQUIREMENT R02</span>
        </div>
        <h2 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl lg:text-4xl">
          เลือกพื้นที่เป้าหมาย 4 ชุมชนลุ่มน้ำกก
        </h2>
        <p class="mt-2 text-sm sm:text-base text-slate-600 dark:text-[#98A2A8] leading-relaxed">
          โครงการวิจัยมหาวิทยาลัยแม่ฟ้าหลวงมุ่งเน้น 4 ชุมชนหลักตามทะเบียนฐานข้อมูล
          <span class="wv-mono text-[#0284C7] dark:text-[#00E5FF]">Village!B1:E2</span>
          เพื่อเชื่อมต่อผลตรวจน้ำภาคประชาชน ข้อมูลสำรวจครัวเรือน แผนเผชิญเหตุน้ำท่วม และการแจ้งเตือน
        </p>
      </div>

      <!-- 4 Community Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div
          v-for="comm in communities"
          :key="comm.id"
          class="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white dark:border-[#2C2C2E] dark:bg-[#1E1E1E] p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[#0284C7] dark:hover:border-[#00E5FF] hover:shadow-[0_8px_30px_rgba(2,132,199,0.12)] cursor-pointer shadow-sm"
          @click="onSelect(comm.id)"
        >
          <!-- Card Top: Area Name & River Segment -->
          <div>
            <div class="flex items-start justify-between gap-2 mb-3">
              <span
                class="rounded-lg px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase"
                :style="{
                  backgroundColor: `${communityRoleBadges[comm.id]?.color || '#00E5FF'}15`,
                  color: communityRoleBadges[comm.id]?.color || '#00E5FF',
                  border: `1px solid ${communityRoleBadges[comm.id]?.color || '#00E5FF'}35`,
                }"
              >
                {{ communityRoleBadges[comm.id]?.riverPart }}
              </span>

              <div class="text-right text-[11px] text-slate-500 dark:text-[#98A2A8] wv-mono">
                {{ comm.center[0].toFixed(3) }}°N, {{ comm.center[1].toFixed(3) }}°E
              </div>
            </div>

            <h3 class="text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#0284C7] dark:group-hover:text-[#00E5FF] transition-colors">
              {{ comm.fullName }}
            </h3>

            <p class="mt-1 text-xs text-slate-500 dark:text-[#98A2A8]">
              {{ comm.subdistrict }} {{ comm.district }} {{ comm.province }}
            </p>

            <!-- Metrics / Highlights -->
            <div class="mt-4 space-y-2 border-t border-slate-200 dark:border-[#2C2C2E] pt-3.5 text-xs">
              <div v-if="comm.hasVerifiedSurvey" class="flex items-center justify-between text-xs">
                <span class="text-slate-600 dark:text-[#98A2A8] flex items-center gap-1.5">
                  <CheckCircle2 class="h-3.5 w-3.5 text-[#16A34A] dark:text-[#32D74B]" />
                  ชุดสำรวจยืนยัน
                </span>
                <span class="font-bold text-slate-900 dark:text-white wv-mono">{{ comm.surveyRows }} ครัวเรือน</span>
              </div>
              <div v-else class="flex items-center justify-between text-xs">
                <span class="text-slate-600 dark:text-[#98A2A8] flex items-center gap-1.5">
                  <Clock class="h-3.5 w-3.5 text-slate-400 dark:text-[#98A2A8]" />
                  ชุดสำรวจภาคสนาม
                </span>
                <span class="text-slate-500 dark:text-[#98A2A8] italic">รอบถัดไป</span>
              </div>

              <div class="text-[11px] text-slate-500 dark:text-[#98A2A8] leading-snug pt-1">
                {{ comm.note }}
              </div>
            </div>
          </div>

          <!-- Card Bottom CTA -->
          <div class="mt-6 pt-3 border-t border-slate-200 dark:border-[#2C2C2E]">
            <button
              type="button"
              class="w-full rounded-xl bg-slate-100 dark:bg-[#252525] group-hover:bg-[#0284C7] dark:group-hover:bg-[#00E5FF] px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-white group-hover:text-white dark:group-hover:text-[#081316] transition-all flex items-center justify-center gap-2"
              @click.stop="onSelect(comm.id)"
            >
              <span>เข้าสู่ข้อมูล{{ comm.name }}</span>
              <ArrowRight class="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer: R12 Funders & Partner Statement -->
    <footer class="border-t border-slate-200 bg-white dark:border-[#2C2C2E] dark:bg-[#1E1E1E] px-4 py-5 text-xs text-slate-500 dark:text-[#98A2A8] lg:px-8">
      <div class="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4">
        <div>
          <strong class="text-slate-900 dark:text-white">MFU Kok Water Watch · มหาวิทยาลัยแม่ฟ้าหลวง (R12, R29)</strong>
          <p class="mt-1">
            แหล่งทุนและพันธมิตรโครงการ: Oxfam · ADPC · DFAT รัฐบาลออสเตรเลีย · SDC รัฐบาลสวิตเซอร์แลนด์ · มหาวิทยาลัยแม่ฟ้าหลวง
          </p>
        </div>
        <div class="wv-mono text-right text-[11px]">
          <div>4 ชุมชนโฟกัส: ท่าตอน (129) · กะเหรี่ยงรวมมิตร · ปงของ · ปากอิงใต้</div>
          <div>Contract: 5.0.0-evidence-20261013 · แผนที่ OpenStreetMap (OSM)</div>
        </div>
      </div>
    </footer>
  </div>
</template>
