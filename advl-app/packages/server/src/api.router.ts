/**
 * api.router.ts — Server-side API routes
 *
 * Exposes filesystem operations and system info to the browser-based Core app.
 * The BrowserAdapter (adapter.browser.ts) calls these endpoints instead of
 * accessing the OS directly.
 *
 * All /api/fs/* routes return { ok: boolean, data?, error? } envelopes.
 *
 * Routes:
 *   GET  /api/health              — Health check
 *   GET  /api/fs/read             — Read file (?path=)
 *   POST /api/fs/write            — Write file { path, content }
 *   GET  /api/fs/dir              — List directory as DirEntry[] (?path=)
 *   GET  /api/fs/exists           — Check existence (?path=)
 *   GET  /api/fs/stat             — File stats (?path=)
 *   GET  /api/fs/roots            — Filesystem roots for File Explorer
 */
import { Router, type Request, type Response } from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { ADVL_VERSION } from '@advl/shared'

const router = Router()

interface DirEntry {
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
}

function ok<T>(res: Response, data: T): void {
  res.json({ ok: true, data })
}

function fail(res: Response, status: number, error: string): void {
  res.status(status).json({ ok: false, error })
}

// ── Health ────────────────────────────────────────────────────────────────────

router.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, data: { version: ADVL_VERSION, mode: 'server' } })
})

// ── POST /api/project/root — set active project root ─────────────────────────
// Browser calls this whenever the user opens a project.
// Sets process.env.ADVL_PROJECT_ROOT so the spawned agent process can read it
// on its next query (agent inherits env from server via ...process.env at spawn).
// Also broadcasts the new root over WebSocket so the agent gets it immediately.

router.post('/project/root', (req: Request, res: Response) => {
  const { root } = req.body as { root?: string }
  if (!root) { fail(res, 400, 'root is required'); return }
  process.env['ADVL_PROJECT_ROOT'] = root
  console.log(`[Server] Project root set: ${root}`)
  ok(res, { root })
})

router.get('/project/root', (_req: Request, res: Response) => {
  ok(res, { root: process.env['ADVL_PROJECT_ROOT'] ?? null })
})

// ── GET /api/fs/read?path= ────────────────────────────────────────────────────

router.get('/fs/read', async (req: Request, res: Response) => {
  const filePath = req.query['path'] as string
  if (!filePath) { fail(res, 400, 'path query parameter required'); return }
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    ok(res, content)
  } catch (err) {
    fail(res, 404, String(err))
  }
})

// ── POST /api/fs/write ────────────────────────────────────────────────────────

router.post('/fs/write', async (req: Request, res: Response) => {
  const { path: filePath, content } = req.body as { path: string; content: string }
  if (!filePath || content === undefined) { fail(res, 400, 'path and content required'); return }
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, content, 'utf-8')
    ok(res, null)
  } catch (err) {
    fail(res, 500, String(err))
  }
})

// ── GET /api/fs/dir?path= — returns DirEntry[] ───────────────────────────────

router.get('/fs/dir', async (req: Request, res: Response) => {
  const dirPath = req.query['path'] as string
  if (!dirPath) { fail(res, 400, 'path query parameter required'); return }
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const data: DirEntry[] = entries.map((e) => ({
      name: e.name,
      path: path.join(dirPath, e.name),
      isDirectory: e.isDirectory(),
      isFile: e.isFile(),
    }))
    ok(res, data)
  } catch (err) {
    fail(res, 404, String(err))
  }
})

// ── GET /api/fs/exists?path= ──────────────────────────────────────────────────

router.get('/fs/exists', async (req: Request, res: Response) => {
  const checkPath = req.query['path'] as string
  if (!checkPath) { fail(res, 400, 'path query parameter required'); return }
  try {
    await fs.access(checkPath)
    ok(res, true)
  } catch {
    ok(res, false)
  }
})

// ── GET /api/fs/stat?path= ────────────────────────────────────────────────────

router.get('/fs/stat', async (req: Request, res: Response) => {
  const statPath = req.query['path'] as string
  if (!statPath) { fail(res, 400, 'path query parameter required'); return }
  try {
    const stat = await fs.stat(statPath)
    ok(res, {
      size: stat.size,
      isDirectory: stat.isDirectory(),
      isFile: stat.isFile(),
      modified: stat.mtime.toISOString(),
      created: stat.birthtime.toISOString(),
    })
  } catch (err) {
    fail(res, 404, String(err))
  }
})

// ── GET /api/fs/roots — filesystem roots for File Explorer ───────────────────

router.get('/fs/roots', async (_req: Request, res: Response) => {
  if (process.platform === 'win32') {
    const roots: DirEntry[] = []
    for (const drive of ['C', 'D', 'E', 'F', 'G', 'H']) {
      const drivePath = `${drive}:\\`
      try {
        await fs.access(drivePath)
        roots.push({ name: `${drive}:`, path: drivePath, isDirectory: true, isFile: false })
      } catch { /* drive not available */ }
    }
    ok(res, roots)
    return
  }

  const home = os.homedir()
  ok(res, [
    { name: 'Home', path: home, isDirectory: true, isFile: false },
    { name: '/', path: '/', isDirectory: true, isFile: false },
  ])
})

export default router
