import type { Plugin } from 'vite'
import { createExpressApp } from '../api/express-app.js'

export function localApi(): Plugin {
  let app: ReturnType<typeof createExpressApp> | null = null
  return {
    name: 'local-survey-express-api',
    configResolved(config) {
      app = createExpressApp(config.root)
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        return app ? app(req, res, next) : next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        return app ? app(req, res, next) : next()
      })
    },
  }
}
