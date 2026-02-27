/**
 * api.router.ts — Server-side API routes
 *
 * Exposes filesystem operations and system info to the browser-based Core app.
 * The BrowserAdapter calls these endpoints instead of accessing the OS directly.
 *
 * Routes:
 *   GET  /api/health                — Health check, returns version and mode
 *   POST /api/filesystem/read       — Read a file from the server filesystem
 *   POST /api/filesystem/write      — Write a file to the server filesystem
 *   GET  /api/filesystem/dir        — List directory contents
 *   GET  /api/filesystem/exists     — Check if a path exists
 */
import { Router } from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import { ADVL_VERSION } from '@advl/shared'

const router = Router()

// ── Health ──────────────────────────────────────────────────────────────────

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: ADVL_VERSION,
    mode: 'server',
    timestamp: new Date().toISOString(),
  })
})

// ── Filesystem ───────────────────────────────────────────────────────────────

router.post('/filesystem/read', async (req, res) => {
  const { path: filePath } = req.body as { path: string }
  if (!filePath) {
    res.status(400).json({ error: 'path is required' })
    return
  }
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    res.send(content)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.post('/filesystem/write', async (req, res) => {
  const { path: filePath, content } = req.body as { path: string; content: string }
  if (!filePath || content === undefined) {
    res.status(400).json({ error: 'path and content are required' })
    return
  }
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, content, 'utf-8')
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.get('/filesystem/dir', async (req, res) => {
  const dirPath = req.query['path'] as string
  if (!dirPath) {
    res.status(400).json({ error: 'path query parameter is required' })
    return
  }
  try {
    const entries = await fs.readdir(dirPath)
    res.json(entries)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.get('/filesystem/exists', async (req, res) => {
  const checkPath = req.query['path'] as string
  if (!checkPath) {
    res.status(400).json({ error: 'path query parameter is required' })
    return
  }
  try {
    await fs.access(checkPath)
    res.json({ exists: true })
  } catch {
    res.json({ exists: false })
  }
})

export default router
