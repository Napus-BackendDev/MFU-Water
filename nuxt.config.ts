import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  srcDir: 'app',
  serverDir: 'server',
  devtools: { enabled: false },
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css', 'leaflet/dist/leaflet.css'],
  colorMode: {
    preference: 'light',
    fallback: 'light',
    classSuffix: '',
  },
  icon: {
    serverBundle: {
      collections: ['lucide'],
    },
  },
  nitro: {
    externals: {
      external: ['@google/earthengine'],
    },
  },
  app: {
    head: {
      title: 'MFU Kok Water Watch',
      htmlAttrs: {
        lang: 'th',
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'ระบบติดตามคุณภาพน้ำแม่น้ำกกและข้อมูลชุมชนต้นแบบ มหาวิทยาลัยแม่ฟ้าหลวง (R01–R29 ข้อมูลจริง KokData)',
        },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@600;700&family=Noto+Sans+Thai:wght@400;500;600;700&display=swap',
        },
      ],
      script: [
        {
          innerHTML: `(function(){try{if(localStorage.getItem('nuxt-color-mode')==='dark'){localStorage.setItem('nuxt-color-mode','light');}document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');}catch(e){}})();`,
        },
      ],
    },
  },
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.VITE_SUPABASE_URL ?? process.env.NUXT_PUBLIC_SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY ?? process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      allowHostedSupabase: process.env.VITE_ALLOW_HOSTED_SUPABASE ?? 'false',
      mapTilerApiKey: process.env.VITE_MAPTILER_API_KEY ?? '',
      turnstileEnabled: process.env.VITE_TURNSTILE_ENABLED ?? 'false',
      turnstileSiteKey: process.env.VITE_TURNSTILE_SITE_KEY ?? '',
    },
  },
})
