/**
 * preload.ts — Electron secure contextBridge preload script
 *
 * Runs in the renderer context with access to Node.js APIs, but exposes
 * ONLY a typed, controlled API surface to the renderer via contextBridge.
 * This is the security boundary between the web content and the OS.
 *
 * NEVER expose `require`, `fs`, or any Node.js module directly.
 * ALL OS access goes through the typed bridge methods below.
 */
import { contextBridge, ipcRenderer } from 'electron'
// @ts-ignore
import { IPC_CHANNELS } from '@advl/shared'

// Signal to Core that it is running inside Electron
contextBridge.exposeInMainWorld('__ADVL_ELECTRON__', true)

// Expose the typed IPC bridge
contextBridge.exposeInMainWorld('advlBridge', {
  /**
   * Invoke an IPC channel and return the result.
   * Only whitelisted channels can be called.
   */
  invoke: (channel: string, data?: unknown): Promise<unknown> => {
    const allowed = [
      IPC_CHANNELS.READ_FILE,
      IPC_CHANNELS.WRITE_FILE,
      IPC_CHANNELS.READ_DIR,
      IPC_CHANNELS.EXISTS,
      IPC_CHANNELS.OPEN_FOLDER_DIALOG,
      IPC_CHANNELS.GET_PROJECT_ROOT,
      'advl:agent-send',
    ]
    if (!allowed.includes(channel)) {
      return Promise.reject(new Error(`IPC channel not allowed: ${channel}`))
    }
    return ipcRenderer.invoke(channel, data)
  },

  /**
   * Register a listener for events pushed from the main process.
   * Used for agent messages forwarded from the main process.
   */
  on: (channel: string, callback: (...args: unknown[]) => void): void => {
    const allowed = ['advl:agent-message']
    if (!allowed.includes(channel)) return
    ipcRenderer.on(channel, (_event, ...args) => callback(...args))
  },
})
