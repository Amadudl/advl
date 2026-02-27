/**
 * adapter.electron.ts — Electron platform adapter implementation
 *
 * Implements IPlatformAdapter using Electron's IPC bridge.
 * The renderer process cannot access Node.js directly — all OS operations
 * go through the secure contextBridge exposed by preload.ts.
 *
 * IPC channels are defined in packages/electron/src/ipc.handlers.ts
 * and mirrored in shared/src/constants/advl.constants.ts (IPC_CHANNELS).
 */
import type { AgentMessage, PlatformInfo } from '@advl/shared'
import { IPC_CHANNELS } from '@advl/shared'
import type { IPlatformAdapter } from './adapter.interface'

// Type for the bridge injected by preload.ts
interface AdvlBridge {
  invoke(channel: string, data?: unknown): Promise<unknown>
  on(channel: string, callback: (...args: unknown[]) => void): void
}

declare global {
  interface Window {
    __ADVL_ELECTRON__: boolean
    advlBridge: AdvlBridge
  }
}

export class ElectronAdapter implements IPlatformAdapter {
  private agentMessageCallbacks: Array<(message: AgentMessage) => void> = []

  constructor() {
    // Listen for agent messages forwarded from the main process via IPC
    // TODO: Register IPC listener for agent messages when agent IPC channel is defined
  }

  async readFile(path: string): Promise<string> {
    // TODO: Implement — invoke IPC channel, return file content as string
    // return window.advlBridge.invoke(IPC_CHANNELS.READ_FILE, { path }) as Promise<string>
    return window.advlBridge.invoke(IPC_CHANNELS.READ_FILE, { path }) as Promise<string>
  }

  async writeFile(path: string, content: string): Promise<void> {
    // TODO: Implement — invoke IPC channel, write file content
    await window.advlBridge.invoke(IPC_CHANNELS.WRITE_FILE, { path, content })
  }

  async readDir(path: string): Promise<string[]> {
    // TODO: Implement — invoke IPC channel, return list of entry names
    return window.advlBridge.invoke(IPC_CHANNELS.READ_DIR, { path }) as Promise<string[]>
  }

  async exists(path: string): Promise<boolean> {
    // TODO: Implement — invoke IPC channel, return boolean
    return window.advlBridge.invoke(IPC_CHANNELS.EXISTS, { path }) as Promise<boolean>
  }

  async openFolderDialog(): Promise<string | null> {
    // TODO: Implement — invoke IPC channel, return selected path or null
    return window.advlBridge.invoke(IPC_CHANNELS.OPEN_FOLDER_DIALOG) as Promise<string | null>
  }

  async getProjectRoot(): Promise<string> {
    // TODO: Implement — invoke IPC channel, return stored project root path
    return window.advlBridge.invoke(IPC_CHANNELS.GET_PROJECT_ROOT) as Promise<string>
  }

  async sendToAgent(message: AgentMessage): Promise<void> {
    // TODO: Implement — send message to agent via IPC (agent runs as child process in main process)
    // In Electron mode, the main process owns the agent WebSocket connection
    // and proxies messages between renderer and agent via IPC
    await window.advlBridge.invoke('advl:agent-send', { message })
  }

  onAgentMessage(callback: (message: AgentMessage) => void): void {
    // TODO: Implement — register callback, wire to IPC listener for agent messages
    this.agentMessageCallbacks.push(callback)
    window.advlBridge.on('advl:agent-message', (message) => {
      callback(message as AgentMessage)
    })
  }

  getPlatformInfo(): PlatformInfo {
    return {
      mode: 'electron',
      version: '0.1.0',
      capabilities: ['local-filesystem', 'native-dialogs', 'offline'],
    }
  }
}
