/**
 * static.middleware.ts — Serves the built Core application as static files
 *
 * In server mode, the Core React app is pre-built to packages/core/dist/.
 * This middleware serves that dist directory and handles SPA routing by
 * returning index.html for any non-API, non-WS path (React Router support).
 */
import type { Application, Request, Response } from 'express'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function setupStaticMiddleware(app: Application): void {
  const coreDist = path.resolve(__dirname, '../../core/dist')

  if (!fs.existsSync(coreDist)) {
    console.warn(`[Static] Core dist not found at ${coreDist}`)
    console.warn('[Static] Run: pnpm --filter core build')
    return
  }

  // Serve static assets (JS, CSS, images, etc.)
  app.use(express.static(coreDist))

  // SPA fallback — return index.html for all non-API routes
  // This enables React Router to handle client-side navigation
  app.get('*', (req: Request, res: Response) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/ws')) {
      return
    }
    res.sendFile(path.join(coreDist, 'index.html'))
  })
}
