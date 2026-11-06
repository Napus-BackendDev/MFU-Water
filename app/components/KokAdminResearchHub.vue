<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Flame,
  HeartPulse,
  Layers,
  Loader2,
  MapPin,
  Save,
  Search,
  ShieldCheck,
  Sprout,
  Users,
  Waves,
} from 'lucide-vue-next'
import { actionButtonClass, adminCardClass, primaryButtonClass } from '../utils/admin-ui'
import { adminFetch } from '../utils/admin-session'

type SwgTeamId = 'swg1' | 'swg2' | 'swg3' | 'swg41' | 'swg42' | 'swg5' | 'swg6' | 'swg7'

interface SwgTeam {
  id: SwgTeamId
  code: string
  name: string
  leadTopic: string
  subtopics: string[]
  icon: any
  badgeColor: string
  status: 'published' | 'draft'
  lastUpdated: string
  summary: string
  guidelines: string[]
  metrics: { label: string; value: string }[]
  pdfDownloadName: string
}

const iconMap: Record<string, any> = {
  swg1: Filter,
  swg2: Waves,
  swg3: Sprout,
  swg41: HeartPulse,
  swg42: Users,
  swg5: ShieldCheck,
  swg6: Layers,
  swg7: BookOpen,
}

const activeTeamId = ref<SwgTeamId>('swg1')
const isSavedToastVisible = ref(false)
const searchQuery = ref('')
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref<string | null>(null)

const teams = ref<SwgTeam[]>([
  {
    id: 'swg1',
    code: 'SWG 1',
    name: 'ระบบกรองน้ำบำบัดสารหนู',
    leadTopic: 'นวัตกรรมระบบกรองทรายชีวภาพ (Bio-sand Filter) และคู่มือชุมชน',
    subtopics: ['การบำบัดสารหนูด้วยทรายและเหล็ก', 'คู่มือสร้างถังกรองขนาดครัวเรือน', 'การล้างทำความสะอาดไส้กรอง'],
    icon: Filter,
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900',
    status: 'published',
    lastUpdated: '1 พ.ย. 2569',
    summary: 'ระบบกรองทรายชีวภาพผสมเศษตะปูเหล็ก (Iron-enhanced bio-sand) สามารถดูดซับสารหนูชนิด As(III) และ As(V) ได้มากกว่า 90% เหมาะสำหรับครัวเรือนริมน้ำกกที่ต้องใช้น้ำจากบ่อตื้น',
    guidelines: [
      'ใช้อัตราการไหลของน้ำ 20–30 ลิตร/ชั่วโมง เพื่อให้จุลินทรีย์ทำงานได้สมบูรณ์',
      'ล้างทำความสะอาดชั้นทรายด้านบน (Schmutzdecke) ทุก 2-3 สัปดาห์',
      'ตรวจวัดน้ำหลังกรองทุก 3 เดือนด้วยชุดตรวจภาคสนาม',
    ],
    metrics: [
      { label: 'ประสิทธิภาพกรองสารหนู', value: '> 90%' },
      { label: 'ต้นทุนเฉลี่ยต่อครัวเรือน', value: '450 บาท' },
      { label: 'ครัวเรือนต้นแบบนำร่อง', value: '18 หลังคาเรือน' },
    ],
    pdfDownloadName: 'คู่มือสร้างถังกรองทรายชีวภาพ_SWG1.pdf',
  },
  {
    id: 'swg2',
    code: 'SWG 2.1',
    name: 'เฝ้าระวังคุณภาพน้ำและแล็บ',
    leadTopic: 'รายงานผลการวิเคราะห์ตัวอย่างน้ำ 22 รอบ และแนวโน้มฤดูกาล',
    subtopics: ['ผลแล็บ ICP-MS เทียบชุดตรวจภาคสนาม', 'แนวโน้มสารหนูช่วงน้ำหลาก vs น้ำแล้ง', 'เกณฑ์ปลอดภัยน้ำดื่ม'],
    icon: Waves,
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900',
    status: 'published',
    lastUpdated: '31 ต.ค. 2569',
    summary: 'การติดตามตรวจวัดคุณภาพน้ำในแม่น้ำกกต่อเนื่อง 22 รอบ พบว่าสารหนูมีความเข้มข้นสูงขึ้นในฤดูแล้ง (ก.พ.–เม.ย.) เนื่องจากปริมาณน้ำเจือจางลดลง ขณะที่ฤดูน้ำหลากมีการพัดพาตะกอนแขวนลอยที่มีสารหนูปะปน',
    guidelines: [
      'น้ำดื่มต้องมีสารหนูไม่เกิน 10 ppb (ตามเกณฑ์ WHO) หรือไม่เกิน 50 ppb ในภาวะฉุกเฉิน',
      'เลี่ยงการสูบน้ำดิบเข้าหมู่บ้านในช่วงต้นฤดูน้ำหลากแรก (First flush)',
      'ชุดตรวจภาคสนามให้ผลแม่นยำสอดคล้องกับแล็บ ICP-MS ในช่วง 10–100 ppb',
    ],
    metrics: [
      { label: 'จำนวนรอบการตรวจแล็บ', value: '22 รอบ' },
      { label: 'จุดตรวจเฝ้าระวังถาวร', value: '14 สถานี' },
      { label: 'ความแม่นยำเทียบชุดตรวจ', value: '94.2%' },
    ],
    pdfDownloadName: 'รายงานเฝ้าระวังคุณภาพน้ำกก_SWG2.pdf',
  },
  {
    id: 'swg3',
    code: 'SWG 3',
    name: 'เศรษฐกิจชุมชนและการเกษตร',
    leadTopic: 'ปฏิทินเกษตรกรรมลุ่มน้ำกกและแนวทางการใช้น้ำปลอดภัยในรอบทำนา',
    subtopics: ['ปฏิทินเพาะปลูกข้าวนาปี/นาปรัง', 'การดูดซึมสารหนูในรวงข้าว', 'การจัดการแปลงนาสลับเปียกแห้ง'],
    icon: Sprout,
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
    status: 'published',
    lastUpdated: '28 ต.ค. 2569',
    summary: 'งานวิจัยพบว่าการทำนาแบบเปียกสลับแห้ง (AWD - Alternate Wetting and Drying) ช่วยลดการดูดซึมสารหนูเข้าสู่รวงข้าวได้ถึง 40% เมื่อเทียบกับการขังน้ำตลอดเวลา พร้อมคำแนะนำช่วงเวลาสูบน้ำเข้าแปลง',
    guidelines: [
      'งดสูบน้ำจากแม่น้ำกกเข้าแปลงนาช่วงข้าวตั้งท้องหากค่าเกิน 50 ppb',
      'นำระบบทำนาเปียกสลับแห้งมาใช้เพื่อลดการสะสมของสารหนูในเมล็ดข้าว',
      'ตรวจสารหนูในดินและรวงข้าวหลังเก็บเกี่ยวเป็นประจำทุกปี',
    ],
    metrics: [
      { label: 'แปลงนาสาธิต', value: '6 แปลง' },
      { label: 'ลดการสะสมในข้าว', value: 'ลดลง 40%' },
      { label: 'ประหยัดน้ำสูบ', value: '25%' },
    ],
    pdfDownloadName: 'ปฏิทินเกษตรปลอดภัยลุ่มน้ำกก_SWG3.pdf',
  },
  {
    id: 'swg41',
    code: 'SWG 4.1',
    name: 'สุขภาพและพิษวิทยาสารหนู',
    leadTopic: 'สัญญาณเตือนอาการสารหนูสะสมเรื้อรัง และคู่มือคัดกรอง รพ.สต.',
    subtopics: ['อาการทางผิวหนังและการเปลี่ยนสีผิว (Keratosis)', 'ผลกระทบต่อตับและไต', 'เกณฑ์คัดกรองกลุ่มเสี่ยง รพ.สต.'],
    icon: HeartPulse,
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900',
    status: 'published',
    lastUpdated: '25 ต.ค. 2569',
    summary: 'คู่มือสุขภาพชุมชนอธิบายภาษาชาวบ้าน: อาการตุ่มแข็งที่ฝ่ามือฝ่าเท้า (Keratosis) รอยด่างดำเหมือนหยดน้ำฝนบนผิวหนัง และอาการอ่อนเพลียเรื้อรัง พร้อมเชื่อมประสานจุดส่งต่อผู้ป่วยไปยัง รพ.สต.',
    guidelines: [
      'สังเกตความผิดปกติที่ผิวหนัง: ตุ่มแข็งที่ฝ่ามือ ฝ่าเท้า หรือผิวหนังคล้ำเป็นหย่อม',
      'หากดื่มน้ำจากแหล่งเสี่ยงเกิน 6 เดือน ควรเข้าตรวจปัสสาวะที่ รพ.สต.',
      'รพ.สต. ใน 4 ชุมชนเป้าหมายมีชุดประเมินสุขภาพเบื้องต้นรองรับ',
    ],
    metrics: [
      { label: 'ตรวจคัดกรองประชาชนแล้ว', value: '6,269 คน' },
      { label: 'รพ.สต. เครือข่าย', value: '8 แห่ง' },
      { label: 'กลุ่มที่ต้องติดตามใกล้ชิด', value: '114 คน' },
    ],
    pdfDownloadName: 'คู่มือสุขภาพและอาการสารหนู_SWG41.pdf',
  },
  {
    id: 'swg42',
    code: 'SWG 4.2',
    name: 'สังคมและกลุ่มเปราะบาง',
    leadTopic: 'ดัชนีความเปราะบางรายหมู่บ้าน (SIMVA) และข้อมูลสวัสดิการ',
    subtopics: ['ดัชนีกลุ่มเปราะบางระดับ 1–5', 'ทะเบียนผู้สูงอายุติดเตียงและผู้พิการ', 'การคุ้มครองข้อมูลส่วนบุคคล (PDPA)'],
    icon: Users,
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900',
    status: 'published',
    lastUpdated: '20 ต.ค. 2569',
    summary: 'การจำแนกความเปราะบาง 5 ระดับ ช่วยให้ผู้นำชุมชนและทีมกู้ภัยรู้ว่าหลังคาเรือนใดต้องการความช่วยเหลือเร่งด่วนในภาวะฉุกเฉิน โดยข้อมูลหมุดรายบ้านถูกเก็บเป็นความลับ (Private) เผยแพร่เฉพาะสถิติภาพรวม',
    guidelines: [
      'ระดับ 1 (วิกฤต): ผู้ป่วยติดเตียงและคนพิการ ช่วยเหลือตัวเองไม่ได้ ต้องอพยพทันที',
      'ระดับ 2 (เร่งด่วน): ผู้สูงอายุอยู่ตามลำพังและเด็กเล็ก ขาดพาหนะ',
      'ระดับ 5 (ทั่วไป): ครัวเรือนแข็งแรง มีพาหนะและระบบกรองน้ำเอง',
    ],
    metrics: [
      { label: 'หลังคาเรือนในระบบสำรวจ', value: '129 ครัวเรือน' },
      { label: 'กลุ่มวิกฤตในคิวอพยพ', value: '68 หลังคาเรือน' },
      { label: 'ระดับความปลอดภัยข้อมูล', value: 'PDPA Compliant' },
    ],
    pdfDownloadName: 'รายงานดัชนีเปราะบางชุมชน_SWG42.pdf',
  },
  {
    id: 'swg5',
    code: 'SWG 5',
    name: 'แผนจัดการภัยพิบัติน้ำท่วม',
    leadTopic: 'แบบจำลองพื้นที่น้ำท่วม แผนรับมือฉุกเฉิน และศูนย์พักพิงชุมชน',
    subtopics: ['แบบจำลองความสูงน้ำ 3 ระดับ', 'จุดปลอดภัยและศูนย์พักพิงตามแผน', 'เส้นทางอพยพเลี่ยงดินสไลด์'],
    icon: ShieldCheck,
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900',
    status: 'published',
    lastUpdated: '18 ต.ค. 2569',
    summary: 'แผนเผชิญเหตุน้ำท่วมและดินถล่มเฉพาะ 4 ชุมชน เชื่อมโยงจุดรวมพล ศูนย์พักพิงที่มีน้ำดื่มสะอาด และเส้นทางอพยพที่ไม่ถูกตัดขาดเมื่อน้ำล้นตลิ่ง',
    guidelines: [
      'เมื่อระดับน้ำกกเกินตลิ่ง 1 เมตร ให้เคลื่อนย้ายกลุ่มระดับ 1 สู่ศูนย์พักพิงทันที',
      'ศูนย์พักพิงหลักบ้านท่าตอนอยู่ที่ ศาลาประชาคม และ วัดท่าตอน',
      'ตรวจสอบถังสำรองน้ำสะอาดในศูนย์พักพิงก่อนฤดูน้ำหลากทุกปี',
    ],
    metrics: [
      { label: 'ศูนย์พักพิงรับรอง', value: '12 แห่ง' },
      { label: 'เส้นทางอพยพปลอดภัย', value: '8 เส้นทาง' },
      { label: 'จุดเสี่ยงดินสไลด์', value: '5 จุด' },
    ],
    pdfDownloadName: 'แผนจัดการภัยพิบัติน้ำท่วม_SWG5.pdf',
  },
  {
    id: 'swg6',
    code: 'SWG 6',
    name: 'ภูมิสารสนเทศแปลงนาและผังน้ำ',
    leadTopic: 'ผังลุ่มน้ำกก แปลงนาข้าว แนวตลิ่ง และชั้นข้อมูลแผนที่ KML',
    subtopics: ['แนวตลิ่งพังทลายและการเปลี่ยนแปลงทางน้ำ', 'แปลงนาข้าวในเขตท่วมซ้ำซาก', 'ชั้นข้อมูล GIS นำเข้า My Maps'],
    icon: Layers,
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-900',
    status: 'published',
    lastUpdated: '15 ต.ค. 2569',
    summary: 'ชุดชั้นข้อมูลภูมิสารสนเทศที่ระบุแนวทางน้ำเดิม ลำเหมืองสาขา แปลงนาข้าวที่เสี่ยงน้ำท่วมขัง และพิกัดหมู่บ้าน นำเสนอแบบแยกทีละเรื่องเพื่อความเข้าใจง่ายของชาวบ้าน',
    guidelines: [
      'ใช้ภาพถ่ายดาวเทียมความละเอียดสูงตรวจติดตามแนวตลิ่งพังทลายทุก 6 เดือน',
      'เชื่อมข้อมูล KML เข้ากับ My Maps หน้าบ้านเพื่อให้ชุมชนดาวน์โหลดได้',
      'ไม่ซ้อนชั้นข้อมูลหลายชั้นพร้อมกันเกิน 2 เลเยอร์ เพื่อป้องกันความสับสน',
    ],
    metrics: [
      { label: 'ระยะทางลำน้ำที่สำรวจ', value: '130 กม.' },
      { label: 'เลเยอร์ KML ที่เปิดใช้', value: '6 ชุดข้อมูล' },
      { label: 'แปลงนาในเขตเฝ้าระวัง', value: '42 แปลง' },
    ],
    pdfDownloadName: 'ผังภูมิสารสนเทศลุ่มน้ำกก_SWG6.pdf',
  },
  {
    id: 'swg7',
    code: 'SWG 7',
    name: 'นิเวศวัฒนธรรมและประวัติศาสตร์น้ำกก',
    leadTopic: 'ไทม์ไลน์ 11 ยุคประวัติศาสตร์ลุ่มน้ำกก และภูมิปัญญาเหมืองฝาย',
    subtopics: ['ประวัติศาสตร์แม่น้ำกับวิถีชุมชน 11 ช่วง', 'ระบบจัดการน้ำเหมืองฝายดั้งเดิม', 'วิดีโอบันทึกคำบอกเล่าปราชญ์ชาวบ้าน'],
    icon: BookOpen,
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    status: 'published',
    lastUpdated: '12 ต.ค. 2569',
    summary: 'องค์ความรู้ทางประวัติศาสตร์และนิเวศวัฒนธรรมที่สะท้อนว่าชาวลุ่มน้ำกกอยู่ร่วมกับแม่น้ำอย่างไรตั้งแต่อดีต วิวัฒนาการของเหมืองฝาย และการปรับตัวของ 4 กลุ่มชาติพันธุ์ริมฝั่งน้ำ',
    guidelines: [
      'ถ่ายทอดประวัติศาสตร์ 11 ยุคแก่นักเรียนและเยาวชนในโรงเรียนลุ่มน้ำกก',
      'ฟื้นฟูภูมิปัญญาเหมืองฝายเพื่อช่วยชะลอน้ำและดักตะกอนปนเปื้อน',
      'บันทึกภูมิปัญญาปราชญ์ชาวบ้านเป็นคลิปสั้นเผยแพร่ในศูนย์ข้อมูล',
    ],
    metrics: [
      { label: 'ยุคประวัติศาสตร์ที่บันทึก', value: '11 ช่วงยุค' },
      { label: 'ภูมิปัญญาเหมืองฝาย', value: '14 ปราชญ์' },
      { label: 'คลิปสัมภาษณ์ผู้นำดั้งเดิม', value: '8 คลิป' },
    ],
    pdfDownloadName: 'ประวัติศาสตร์นิเวศวัฒนธรรมน้ำกก_SWG7.pdf',
  },
])

const currentTeam = ref<SwgTeam>(teams.value[0]!)

async function fetchTeams() {
  loading.value = true
  errorMessage.value = null
  try {
    const res = await adminFetch('/api/admin/research')
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.teams) && data.teams.length > 0) {
        teams.value = data.teams.map((t: any) => ({
          ...t,
          icon: iconMap[t.id] || Filter,
        }))
        const match = teams.value.find((t) => t.id === activeTeamId.value)
        currentTeam.value = match || teams.value[0]!
      }
    }
  } catch (err: any) {
    errorMessage.value = err?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลทีมวิจัย'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchTeams()
})

function selectTeam(id: SwgTeamId) {
  activeTeamId.value = id
  const found = teams.value.find((t) => t.id === id)
  if (found) currentTeam.value = found
}

async function handleSave() {
  if (!currentTeam.value) return
  saving.value = true
  try {
    const payload = {
      id: currentTeam.value.id,
      leadTopic: currentTeam.value.leadTopic,
      summary: currentTeam.value.summary,
      guidelines: currentTeam.value.guidelines,
      metrics: currentTeam.value.metrics,
      status: currentTeam.value.status,
    }
    const res = await adminFetch(`/api/admin/research/${currentTeam.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.team) {
        currentTeam.value.lastUpdated = data.team.lastUpdated || currentTeam.value.lastUpdated
      }
      isSavedToastVisible.value = true
      setTimeout(() => {
        isSavedToastVisible.value = false
      }, 2500)
    } else {
      alert('บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    }
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 dark:border-[#2C2C2E]">
      <div>
        <div class="flex items-center gap-2">
          <span class="rounded-lg bg-sky-100 p-1.5 text-[#0284C7] dark:bg-sky-950/60 dark:text-sky-300">
            <BookOpen class="h-4 w-4" />
          </span>
          <h2 class="text-base font-bold text-slate-900 dark:text-white">
            จัดการองค์ความรู้ 7 ทีมวิจัย (Research Hub CMS)
          </h2>
        </div>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          รวบรวม ย่อย และบริหารจัดการองค์ความรู้ทั้ง 7 ทีมวิจัย (SWG 1–7) แปลงเป็นคู่มือภาษาชาวบ้านและสื่อดาวน์โหลด (R18)
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          type="button"
          :class="primaryButtonClass"
          :disabled="saving"
          @click="handleSave"
        >
          <Loader2 v-if="saving" class="h-3.5 w-3.5 animate-spin" />
          <Save v-else class="h-3.5 w-3.5" />
          <span>{{ saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข' }}</span>
        </button>
      </div>
    </div>

    <!-- Toast Notification -->
    <div
      v-if="isSavedToastVisible"
      class="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 shadow-xl dark:border-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 transition-all"
    >
      <CheckCircle2 class="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <span>บันทึกข้อมูลองค์ความรู้เรียบร้อย ข้อมูลหน้าบ้านจะอัปเดตทันที</span>
    </div>

    <!-- Main Content Layout (Sidebar Team Selector + Details/Editor Form) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Left: 7 SWG Teams Selector List -->
      <div class="lg:col-span-4 space-y-2">
        <div class="px-1 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          เลือกทีมวิจัย (7 กลุ่มหลัก)
        </div>

        <div class="space-y-1.5">
          <button
            v-for="t in teams"
            :key="t.id"
            type="button"
            class="flex w-full items-center justify-between rounded-xl border p-3 text-left transition cursor-pointer"
            :class="[
              activeTeamId === t.id
                ? 'border-[#0284C7] bg-sky-50/70 shadow-xs ring-1 ring-[#0284C7]/20 dark:border-sky-700 dark:bg-sky-950/30'
                : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:hover:bg-[#252525]'
            ]"
            @click="selectTeam(t.id)"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors"
                :class="activeTeamId === t.id ? 'bg-[#0284C7] text-white' : 'bg-slate-100 text-slate-600 dark:bg-[#252525] dark:text-slate-300'"
              >
                <component :is="t.icon" class="h-4 w-4" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {{ t.code }}
                  </span>
                  <span class="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {{ t.name }}
                  </span>
                </div>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {{ t.leadTopic }}
                </p>
              </div>
            </div>
            <ChevronRight class="h-4 w-4 text-slate-400 shrink-0 ml-1" />
          </button>
        </div>
      </div>

      <!-- Right: Detailed CMS Editor & Knowledge Card -->
      <div class="lg:col-span-8 space-y-5">
        <!-- Team Overview Card -->
        <div :class="adminCardClass" class="p-5 sm:p-6 space-y-5">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-[#2C2C2E]">
            <div class="flex items-center gap-3 min-w-0">
              <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0284C7]/15 text-[#0284C7] dark:bg-sky-950/60 dark:text-sky-300">
                <component :is="currentTeam.icon" class="h-6 w-6" />
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold px-2 py-0.5 rounded-full" :class="currentTeam.badgeColor">
                    {{ currentTeam.code }}
                  </span>
                  <h3 class="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {{ currentTeam.name }}
                  </h3>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  อัปเดตล่าสุด: {{ currentTeam.lastUpdated }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900">
                <Check class="h-3 w-3" />
                เผยแพร่สู่ชุมชนแล้ว
              </span>
            </div>
          </div>

          <!-- Highlight Metrics Bar -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              v-for="(m, idx) in currentTeam.metrics"
              :key="idx"
              class="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-center dark:border-[#2C2C2E] dark:bg-[#161618]"
            >
              <div class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {{ m.label }}
              </div>
              <div class="text-sm sm:text-base font-bold text-[#0284C7] dark:text-sky-300 mt-0.5">
                {{ m.value }}
              </div>
            </div>
          </div>

          <!-- Form Fields -->
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                หัวข้อหลักงานวิจัย (Lead Topic)
              </label>
              <input
                v-model="currentTeam.leadTopic"
                type="text"
                class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 outline-none transition focus:border-[#0284C7] dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                บทคัดย่อภาษาชาวบ้าน (Community-Friendly Summary)
              </label>
              <textarea
                v-model="currentTeam.summary"
                rows="3"
                class="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-xs leading-relaxed text-slate-900 outline-none transition focus:border-[#0284C7] dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white"
              ></textarea>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                ข้อปฏิบัติและแนวทางแนะนำสำหรับชาวบ้าน (Actionable Guidelines)
              </label>
              <div class="space-y-2">
                <div
                  v-for="(guide, gIdx) in currentTeam.guidelines"
                  :key="gIdx"
                  class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 dark:border-[#2C2C2E] dark:bg-[#161618]"
                >
                  <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0284C7] text-[10px] font-bold text-white">
                    {{ gIdx + 1 }}
                  </span>
                  <input
                    v-model="currentTeam.guidelines[gIdx]"
                    type="text"
                    class="w-full bg-transparent text-xs text-slate-800 outline-none dark:text-slate-200"
                  />
                </div>
              </div>
            </div>

            <!-- Downloadable Resource Preview -->
            <div class="rounded-xl border border-sky-100 bg-sky-50/60 p-3.5 dark:border-sky-950/40 dark:bg-sky-950/20">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5 min-w-0">
                  <FileText class="h-5 w-5 text-[#0284C7] dark:text-sky-300 shrink-0" />
                  <div class="min-w-0">
                    <p class="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {{ currentTeam.pdfDownloadName }}
                    </p>
                    <p class="text-[10px] text-slate-500 dark:text-slate-400">
                      เอกสารสรุปฉบับพิมพ์ A4 สำหรับแจกจ่ายชาวบ้านและโรงเรียน
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  class="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                  @click="handleSave"
                >
                  <Download class="h-3.5 w-3.5" />
                  <span>เปลี่ยนไฟล์</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
