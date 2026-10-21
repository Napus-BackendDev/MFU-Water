import { defineEventHandler } from 'h3'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

let expressAppInstance: any = null

function getApiModuleInfo() {
  const cwd = process.cwd()
  const candidate1 = resolve(cwd, 'api/express-app.js')
  if (existsSync(candidate1)) {
    return { filePath: candidate1, rootDir: cwd }
  }
  const candidate2 = resolve(cwd, '..', 'api/express-app.js')
  if (existsSync(candidate2)) {
    return { filePath: candidate2, rootDir: resolve(cwd, '..') }
  }
  return { filePath: candidate1, rootDir: cwd }
}

async function getExpressApp() {
  if (!expressAppInstance) {
    const { filePath, rootDir } = getApiModuleInfo()
    const moduleUrl = pathToFileURL(filePath).href
    const mod = await import(moduleUrl)
    expressAppInstance = mod.createExpressApp(rootDir)
  }
  return expressAppInstance
}

export default defineEventHandler(async (event) => {
  const url = event.node.req.url || ''
  if (!url.startsWith('/api')) return

  const app = await getExpressApp()
  return new Promise((resolve, reject) => {
    event.node.res.once('finish', () => resolve(undefined))
    event.node.res.once('close', () => resolve(undefined))
    app(event.node.req, event.node.res, (err: any) => {
      if (err) reject(err)
      else resolve(undefined)
    })
  })
})

