import { defineConfig } from 'vite';
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
  }
});

export default defineConfig({
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
  }
});
