/**
 * ipc.handlers.ts — Electron IPC handler registrations
 *
 * Registers all ipcMain handlers that the renderer can invoke via the preload bridge.
 * Each handler corresponds to a channel defined in shared/src/constants/advl.constants.ts.
 * These are the ONLY OS-level operations the renderer is allowed to perform.
 */
import { ipcMain, dialog, BrowserWindow, app } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
// @ts-ignore — ESM package consumed from CommonJS target
import { IPC_CHANNELS } from '@advl/shared'

interface DirEntry {
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
}

let currentProjectRoot: string | null = null

export function registerIpcHandlers(): void {
  // ── File System ─────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.READ_FILE, async (_event, data: { path: string }) => {
    return fs.readFile(data.path, 'utf-8')
  })

  ipcMain.handle(IPC_CHANNELS.WRITE_FILE, async (_event, data: { path: string; content: string }) => {
    await fs.mkdir(path.dirname(data.path), { recursive: true })
    await fs.writeFile(data.path, data.content, 'utf-8')
  })

  ipcMain.handle(IPC_CHANNELS.READ_DIR, async (_event, data: { path: string }) => {
    return fs.readdir(data.path)
  })

  ipcMain.handle(IPC_CHANNELS.READ_DIR_RICH, async (_event, data: { path: string }): Promise<DirEntry[]> => {
    const entries = await fs.readdir(data.path, { withFileTypes: true })
    return entries.map((e) => ({
      name: e.name,
      path: path.join(data.path, e.name),
      isDirectory: e.isDirectory(),
      isFile: e.isFile(),
    }))
  })

  ipcMain.handle(IPC_CHANNELS.EXISTS, async (_event, data: { path: string }) => {
    try {
      await fs.access(data.path)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle(IPC_CHANNELS.STAT, async (_event, data: { path: string }) => {
    const stat = await fs.stat(data.path)
    return {
      size: stat.size,
      isDirectory: stat.isDirectory(),
      isFile: stat.isFile(),
      modified: stat.mtime.toISOString(),
      created: stat.birthtime.toISOString(),
    }
  })

  // ── Project Management ──────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.OPEN_FOLDER_DIALOG, async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'ADVL — Projekt öffnen',
      buttonLabel: 'Projekt öffnen',
    })

    if (result.canceled || result.filePaths.length === 0) return null

    currentProjectRoot = result.filePaths[0] ?? null
    return currentProjectRoot
  })

  ipcMain.handle(IPC_CHANNELS.GET_PROJECT_ROOT, () => {
    return currentProjectRoot ?? ''
  })

  ipcMain.handle(IPC_CHANNELS.SET_PROJECT_ROOT, (_event, data: { root: string }) => {
    currentProjectRoot = data.root
  })

  ipcMain.handle(IPC_CHANNELS.GET_FILESYSTEM_ROOTS, async (): Promise<DirEntry[]> => {
    if (process.platform === 'win32') {
      const roots: DirEntry[] = []
      for (const drive of ['C', 'D', 'E', 'F', 'G', 'H']) {
        const drivePath = `${drive}:\\`
        try {
          await fs.access(drivePath)
          roots.push({ name: `${drive}:`, path: drivePath, isDirectory: true, isFile: false })
        } catch {
          // drive not mounted
        }
      }
      return roots
    }

    const home = os.homedir()
    return [
      { name: 'Home', path: home, isDirectory: true, isFile: false },
      { name: '/', path: '/', isDirectory: true, isFile: false },
    ]
  })
}
