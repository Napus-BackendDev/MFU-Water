import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Express } from 'express'

export type ExpressRequestListener = Express & ((req: IncomingMessage, res: ServerResponse, next?: (err?: unknown) => void) => void)

export function loadServerEnv(rootDir?: string): void
export function createExpressApp(rootDir?: string): ExpressRequestListener
