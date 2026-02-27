/**
 * ipc.handlers.ts — Electron IPC handler registrations
 *
 * Registers all ipcMain handlers that the renderer can invoke via the preload bridge.
 * Each handler corresponds to a channel defined in shared/src/constants/advl.constants.ts.
 * These are the ONLY OS-level operations the renderer is allowed to perform.
 */
import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
// @ts-ignore
import { IPC_CHANNELS } from '@advl/shared'

let currentProjectRoot: string | null = null

export function registerIpcHandlers(): void {
  // ── File System ─────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.READ_FILE, async (_event, data: { path: string }) => {
    const content = await fs.readFile(data.path, 'utf-8')
    return content
  })

  ipcMain.handle(IPC_CHANNELS.WRITE_FILE, async (_event, data: { path: string; content: string }) => {
    await fs.mkdir(path.dirname(data.path), { recursive: true })
    await fs.writeFile(data.path, data.content, 'utf-8')
  })

  ipcMain.handle(IPC_CHANNELS.READ_DIR, async (_event, data: { path: string }) => {
    const entries = await fs.readdir(data.path)
    return entries
  })

  ipcMain.handle(IPC_CHANNELS.EXISTS, async (_event, data: { path: string }) => {
    try {
      await fs.access(data.path)
      return { exists: true }
    } catch {
      return { exists: false }
    }
  })

  // ── Project Management ──────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.OPEN_FOLDER_DIALOG, async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Open ADVL Project',
      buttonLabel: 'Open Project',
    })

    if (result.canceled || result.filePaths.length === 0) return null

    currentProjectRoot = result.filePaths[0] ?? null
    return currentProjectRoot
  })

  ipcMain.handle(IPC_CHANNELS.GET_PROJECT_ROOT, () => {
    return currentProjectRoot
  })
}
