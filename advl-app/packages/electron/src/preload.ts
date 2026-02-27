/**
 * preload.ts — Electron secure contextBridge preload script
 *
 * Runs in the renderer context with access to Node.js APIs, but exposes
 * ONLY a typed, controlled API surface to the renderer via contextBridge.
 * This is the security boundary between the web content and the OS.
 *
 * NEVER expose `require`, `fs`, or any Node.js module directly.
 * ALL OS access goes through the typed bridge methods below.
 *
 * The bridge shape MUST stay in sync with the AdvlBridge interface
 * in packages/core/src/platform/adapter.electron.ts.
 */
import { contextBridge, ipcRenderer } from 'electron'
// @ts-ignore — shared package uses ESM exports, commonjs TS project needs ignore
import { IPC_CHANNELS } from '@advl/shared'

// Signal to Core that it is running inside Electron
contextBridge.exposeInMainWorld('__ADVL_ELECTRON__', true)

// Named bridge — each method maps to exactly one IPC channel
contextBridge.exposeInMainWorld('advlBridge', {
  readFile: (path: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.READ_FILE, { path }) as Promise<string>,

  writeFile: (path: string, content: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.WRITE_FILE, { path, content }) as Promise<void>,

  readDirRich: (path: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.READ_DIR_RICH, { path }),

  exists: (path: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXISTS, { path }) as Promise<boolean>,

  openFolderDialog: () =>
    ipcRenderer.invoke(IPC_CHANNELS.OPEN_FOLDER_DIALOG) as Promise<string | null>,

  getProjectRoot: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_PROJECT_ROOT) as Promise<string>,

  setProjectRoot: (root: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_PROJECT_ROOT, { root }) as Promise<void>,

  getFilesystemRoots: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_FILESYSTEM_ROOTS),
})
