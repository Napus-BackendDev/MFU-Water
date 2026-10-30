import { defineNuxtConfig } from 'nuxt/config'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Load .env.local into process.env so Nuxt runtimeConfig has full access
const envLocalPath = resolve(process.cwd(), '.env.local')
if (existsSync(envLocalPath)) {
  const content = readFileSync(envLocalPath, 'utf8')
  content.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (match) {
      const key = match[1]
      let value = match[2] || ''
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
      process.env[key] = value.trim()
    }
  })
}

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
  vite: {
    envPrefix: ['VITE_', 'NUXT_PUBLIC_'],
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
      mapTilerApiKey: process.env.VITE_MAPTILER_API_KEY ?? '',
    },
  },
})
