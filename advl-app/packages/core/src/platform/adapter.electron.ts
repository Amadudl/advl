/**
 * adapter.electron.ts — Electron platform adapter implementation
 *
 * Implements IPlatformAdapter using Electron's IPC bridge (window.advlBridge).
 * The renderer process cannot access Node.js directly — all OS operations
 * go through the secure contextBridge exposed by preload.ts.
 *
 * Agent communication uses a direct WebSocket to localhost:7433.
 * IPC channels are defined in packages/electron/src/ipc.handlers.ts
 * and mirrored in shared/src/constants/advl.constants.ts (IPC_CHANNELS).
 */
import type { AgentMessage, PlatformInfo } from '@advl/shared'
import { IPC_CHANNELS, DEFAULT_AGENT_PORT } from '@advl/shared'
import type { IPlatformAdapter, DirEntry } from './adapter.interface'

interface AdvlBridge {
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  readDirRich(path: string): Promise<DirEntry[]>
  exists(path: string): Promise<boolean>
  openFolderDialog(): Promise<string | null>
  getProjectRoot(): Promise<string>
  setProjectRoot(root: string): Promise<void>
  getFilesystemRoots(): Promise<DirEntry[]>
}

declare global {
  interface Window {
    __ADVL_ELECTRON__: boolean
    advlBridge: AdvlBridge
  }
}

let agentWs: WebSocket | null = null
let wsMessageHandlers: Array<(msg: AgentMessage) => void> = []

function getOrCreateWs(): WebSocket {
  if (agentWs && agentWs.readyState === WebSocket.OPEN) return agentWs

  agentWs = new WebSocket(`ws://localhost:${DEFAULT_AGENT_PORT}`)

  agentWs.onmessage = (event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data as string) as AgentMessage
      wsMessageHandlers.forEach((h) => h(msg))
    } catch {
      // malformed message — ignore
    }
  }

  agentWs.onclose = () => {
    agentWs = null
    setTimeout(getOrCreateWs, 2000)
  }

  agentWs.onerror = (err) => {
    console.error('[ElectronAdapter] WebSocket error:', err)
  }

  return agentWs
}

export class ElectronAdapter implements IPlatformAdapter {

  async readFile(path: string): Promise<string> {
    return window.advlBridge.readFile(path)
  }

  async writeFile(path: string, content: string): Promise<void> {
    return window.advlBridge.writeFile(path, content)
  }

  async readDir(path: string): Promise<DirEntry[]> {
    return window.advlBridge.readDirRich(path)
  }

  async exists(path: string): Promise<boolean> {
    return window.advlBridge.exists(path)
  }

  async openFolderDialog(): Promise<string | null> {
    return window.advlBridge.openFolderDialog()
  }

  async getProjectRoot(): Promise<string> {
    return window.advlBridge.getProjectRoot()
  }

  async setProjectRoot(root: string): Promise<void> {
    return window.advlBridge.setProjectRoot(root)
  }

  async getFilesystemRoots(): Promise<DirEntry[]> {
    return window.advlBridge.getFilesystemRoots()
  }

  async sendToAgent(message: AgentMessage): Promise<void> {
    const ws = getOrCreateWs()
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    } else {
      ws.addEventListener('open', () => ws.send(JSON.stringify(message)), { once: true })
    }
  }

  onAgentMessage(callback: (message: AgentMessage) => void): () => void {
    wsMessageHandlers.push(callback)
    getOrCreateWs()
    return () => {
      wsMessageHandlers = wsMessageHandlers.filter((h) => h !== callback)
    }
  }

  getPlatformInfo(): PlatformInfo {
    return {
      mode: 'electron',
      version: '0.1.0',
      capabilities: ['local-filesystem', 'native-dialogs', 'offline'],
    }
  }
}

// Re-export IPC_CHANNELS so ipc.handlers.ts can be kept in sync
export { IPC_CHANNELS }
