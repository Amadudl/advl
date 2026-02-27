/**
 * adapter.browser.ts — Browser/Server platform adapter implementation
 *
 * Implements IPlatformAdapter using fetch (for filesystem ops) and WebSocket
 * (for agent communication). Used when ADVL is accessed via a browser —
 * either in server-hosted mode or as a future web-only deployment.
 *
 * Filesystem operations are proxied through the Express server API:
 *   POST /api/filesystem/read
 *   POST /api/filesystem/write
 *   GET  /api/filesystem/dir
 *
 * Agent communication goes through the WebSocket at /ws.
 */
import type { AgentMessage, PlatformInfo } from '@advl/shared'
import { AGENT_WS_PATH } from '@advl/shared'
import type { IPlatformAdapter } from './adapter.interface'

export class BrowserAdapter implements IPlatformAdapter {
  private ws: WebSocket | null = null
  private agentMessageCallbacks: Array<(message: AgentMessage) => void> = []
  private projectRoot = ''

  constructor() {
    this.initWebSocket()
  }

  private initWebSocket(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}${AGENT_WS_PATH}`

    // TODO: Add reconnection logic with exponential backoff
    this.ws = new WebSocket(wsUrl)

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data as string) as AgentMessage
        this.agentMessageCallbacks.forEach((cb) => cb(message))
      } catch {
        console.error('[BrowserAdapter] Failed to parse agent message:', event.data)
      }
    }

    this.ws.onerror = (error) => {
      console.error('[BrowserAdapter] WebSocket error:', error)
    }

    // TODO: Handle ws.onclose — trigger reconnect or show disconnected state in UI
  }

  async readFile(path: string): Promise<string> {
    // TODO: Implement — POST /api/filesystem/read, return response body as string
    const response = await fetch('/api/filesystem/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
    if (!response.ok) throw new Error(`readFile failed: ${response.statusText}`)
    return response.text()
  }

  async writeFile(path: string, content: string): Promise<void> {
    // TODO: Implement — POST /api/filesystem/write
    const response = await fetch('/api/filesystem/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    })
    if (!response.ok) throw new Error(`writeFile failed: ${response.statusText}`)
  }

  async readDir(path: string): Promise<string[]> {
    // TODO: Implement — GET /api/filesystem/dir?path=...
    const response = await fetch(`/api/filesystem/dir?path=${encodeURIComponent(path)}`)
    if (!response.ok) throw new Error(`readDir failed: ${response.statusText}`)
    return response.json() as Promise<string[]>
  }

  async exists(path: string): Promise<boolean> {
    // TODO: Implement — GET /api/filesystem/exists?path=...
    const response = await fetch(`/api/filesystem/exists?path=${encodeURIComponent(path)}`)
    if (!response.ok) return false
    const data = await response.json() as { exists: boolean }
    return data.exists
  }

  async openFolderDialog(): Promise<string | null> {
    // TODO: Browser has no native folder picker for arbitrary paths.
    // In server mode, this should show a path input dialog instead.
    // For now: prompt the user for a server-side path.
    const path = window.prompt('Enter project folder path on the server:')
    return path ?? null
  }

  async getProjectRoot(): Promise<string> {
    // TODO: Implement — fetch from server session or local storage
    return this.projectRoot
  }

  async sendToAgent(message: AgentMessage): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('[BrowserAdapter] WebSocket is not connected')
    }
    this.ws.send(JSON.stringify(message))
  }

  onAgentMessage(callback: (message: AgentMessage) => void): void {
    this.agentMessageCallbacks.push(callback)
  }

  getPlatformInfo(): PlatformInfo {
    return {
      mode: 'browser',
      version: '0.1.0',
      capabilities: ['multi-user'],
    }
  }
}
