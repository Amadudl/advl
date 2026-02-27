/**
 * adapter.browser.ts — Browser/Server platform adapter implementation
 *
 * Implements IPlatformAdapter using fetch (filesystem via Express /api/fs/*)
 * and WebSocket (agent via /ws proxy).
 *
 * openFolderDialog() triggers an in-app tree browser instead of the
 * unavailable native OS dialog. Register the show-callback via
 * registerInAppDialogCallback() from App.tsx before the first call.
 *
 * Agent communication goes through the WebSocket at /ws (proxied to agent).
 */
import type { AgentMessage, PlatformInfo } from '@advl/shared'
import { AGENT_WS_PATH } from '@advl/shared'
import type { IPlatformAdapter, DirEntry } from './adapter.interface'

const PROJECT_ROOT_KEY = 'advl:projectRoot'

// ── In-app folder dialog wiring ───────────────────────────────────────────────
// App.tsx calls registerInAppDialogCallback() once on mount.
// When openFolderDialog() is called, it invokes the callback to show the modal,
// then waits for the user to either select a path or cancel.

let _showInAppDialog: (() => void) | null = null
let _inAppDialogResolve: ((path: string | null) => void) | null = null

/** Called by App.tsx to register the function that opens the FileExplorer modal. */
export function registerInAppDialogCallback(fn: () => void): void {
  _showInAppDialog = fn
}

/** Called by FileExplorer when the user confirms or cancels a selection. */
export function resolveInAppFolderDialog(path: string | null): void {
  if (_inAppDialogResolve) {
    _inAppDialogResolve(path)
    _inAppDialogResolve = null
  }
}

// ── WebSocket ─────────────────────────────────────────────────────────────────

let _ws: WebSocket | null = null
let _wsHandlers: Array<(msg: AgentMessage) => void> = []
let _reconnectDelay = 1000

function getOrCreateWs(): WebSocket {
  if (_ws && _ws.readyState === WebSocket.OPEN) return _ws

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.host}${AGENT_WS_PATH}`
  _ws = new WebSocket(wsUrl)

  _ws.onopen = () => {
    _reconnectDelay = 1000
  }

  _ws.onmessage = (event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data as string) as AgentMessage
      _wsHandlers.forEach((h) => h(msg))
    } catch {
      console.error('[BrowserAdapter] Failed to parse agent message')
    }
  }

  _ws.onerror = (err) => {
    console.error('[BrowserAdapter] WebSocket error:', err)
  }

  _ws.onclose = () => {
    _ws = null
    _reconnectDelay = Math.min(_reconnectDelay * 2, 30_000)
    setTimeout(getOrCreateWs, _reconnectDelay)
  }

  return _ws
}

// ── Adapter ───────────────────────────────────────────────────────────────────

export class BrowserAdapter implements IPlatformAdapter {

  private async fsGet<T>(route: string): Promise<T> {
    const res = await fetch(`/api/fs/${route}`)
    if (!res.ok) throw new Error(`[BrowserAdapter] GET /api/fs/${route} → ${res.status}`)
    const json = await res.json() as { ok: boolean; data?: T; error?: string }
    if (!json.ok) throw new Error(json.error ?? 'Unknown API error')
    return json.data as T
  }

  private async fsPost<T>(route: string, body: unknown): Promise<T> {
    const res = await fetch(`/api/fs/${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`[BrowserAdapter] POST /api/fs/${route} → ${res.status}`)
    const json = await res.json() as { ok: boolean; data?: T; error?: string }
    if (!json.ok) throw new Error(json.error ?? 'Unknown API error')
    return json.data as T
  }

  async readFile(path: string): Promise<string> {
    return this.fsGet<string>(`read?path=${encodeURIComponent(path)}`)
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.fsPost('write', { path, content })
  }

  async readDir(path: string): Promise<DirEntry[]> {
    return this.fsGet<DirEntry[]>(`dir?path=${encodeURIComponent(path)}`)
  }

  async exists(path: string): Promise<boolean> {
    return this.fsGet<boolean>(`exists?path=${encodeURIComponent(path)}`)
  }

  async openFolderDialog(): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      _inAppDialogResolve = resolve
      if (_showInAppDialog) {
        _showInAppDialog()
      } else {
        console.warn('[BrowserAdapter] No in-app dialog registered — resolving null')
        resolve(null)
      }
    })
  }

  async getProjectRoot(): Promise<string> {
    return localStorage.getItem(PROJECT_ROOT_KEY) ?? ''
  }

  async setProjectRoot(root: string): Promise<void> {
    localStorage.setItem(PROJECT_ROOT_KEY, root)
  }

  async getFilesystemRoots(): Promise<DirEntry[]> {
    return this.fsGet<DirEntry[]>('roots')
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
    _wsHandlers.push(callback)
    getOrCreateWs()
    return () => {
      _wsHandlers = _wsHandlers.filter((h) => h !== callback)
    }
  }

  getPlatformInfo(): PlatformInfo {
    return {
      mode: 'server',
      version: '0.1.0',
      capabilities: ['multi-user'],
    }
  }
}
