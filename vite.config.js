import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const geeApiDevPlugin = () => ({
  name: 'gee-api-dev',
  apply: 'serve',
  async configureServer(vite) {
    const { default: api } = await import('./server/server.js');
    vite.middlewares.use((req, res, next) => {
      if (req.url?.startsWith('/api/')) api(req, res, next);
      else next();
    });
  },
  async configurePreviewServer(vite) {
    const { createWaterWatchPreviewApp } = await import('./server/waterWatchPreview.js');
    const api = createWaterWatchPreviewApp();
    vite.middlewares.use((req, res, next) => {
      if (['/', '/index.html'].includes(req.url?.split('?')[0])) res.setHeader('Cache-Control', 'no-store');
      if (req.url?.startsWith('/api/')) api(req, res, next);
      else next();
    });
  }
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const key of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_CSRF_SECRET', 'PUBLIC_APP_URL', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM', 'ENABLE_SMTP_DELIVERY', 'ENABLE_ADMIN_INVITES']) {
    if (!process.env[key] && env[key]) process.env[key] = env[key];
  }
  return {
  plugins: [react(), geeApiDevPlugin()],
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          'maplibre': ['maplibre-gl'],
          'lucide': ['lucide-react'],
          'react-vendor': ['react', 'react-dom']
        }
      }
    }
  },
  server: {
    port: 3000,
    strictPort: true,
    open: false,
    watch: {
      ignored: ['**/*.approval.json', '**/*.log', '**/tmp/**', '**/.git/**']
    }
  }
  };
});
