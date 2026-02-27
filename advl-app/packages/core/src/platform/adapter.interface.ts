/**
 * adapter.interface.ts — IPlatformAdapter contract
 *
 * The Core application ONLY interacts with the platform through this interface.
 * It never imports ElectronAdapter or BrowserAdapter directly.
 * This is the critical abstraction that makes ADVL run identically in
 * Electron (desktop) and browser (server-hosted) mode.
 *
 * See ARCHITECTURE.md — "Platform Adapter — The Critical Layer"
 */
import type { AgentMessage, PlatformInfo } from '@advl/shared'

export interface IPlatformAdapter {
  // ── Filesystem ───────────────────────────────────────────
  /** Read a file's content as a UTF-8 string */
  readFile(path: string): Promise<string>
  /** Write a UTF-8 string to a file, creating it if it doesn't exist */
  writeFile(path: string, content: string): Promise<void>
  /** List the names of files and directories inside a path */
  readDir(path: string): Promise<string[]>
  /** Check whether a file or directory exists */
  exists(path: string): Promise<boolean>

  // ── Project Management ───────────────────────────────────
  /** Open an OS folder picker dialog. Returns path or null if cancelled. */
  openFolderDialog(): Promise<string | null>
  /** Return the currently open project root directory path */
  getProjectRoot(): Promise<string>

  // ── Agent Communication ──────────────────────────────────
  /** Send a typed message to the Agent process */
  sendToAgent(message: AgentMessage): Promise<void>
  /** Register a callback for messages received from the Agent process */
  onAgentMessage(callback: (message: AgentMessage) => void): void

  // ── Platform Info ────────────────────────────────────────
  /** Return information about the current platform and its capabilities */
  getPlatformInfo(): PlatformInfo
}
