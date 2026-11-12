<script setup lang="ts">
// เนื้อการ์ด “รู้จักชุมชน” ใช้ร่วมกันระหว่างหน้าบ้าน (KokCommunityProfileCard) และพรีวิวของหน้าแอดมิน
defineProps<{ profile: { basin: string; people: string; livelihood: string; risk: string } }>()
const labels = [['ลุ่มน้ำ', 'basin'], ['ผู้คน', 'people'], ['อาชีพ', 'livelihood'], ['ความเสี่ยง', 'risk']] as const
</script>

<template>
  <dl class="mt-2">
    <div v-for="[term, key] in labels" :key="key" class="flex items-start gap-2.5 border-t border-slate-100 py-2.5 text-[15px] leading-relaxed first:border-t-0 dark:border-[#2C2C2E]">
      <dt class="mt-0.5 shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-[#2C2C2E] dark:text-[#C7D0D6]">{{ term }}</dt>
      <dd>{{ profile[key] }}</dd>
    </div>
  </dl>
</template>
