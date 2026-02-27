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

/** A single filesystem entry returned by readDir() and getFilesystemRoots(). */
export interface DirEntry {
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
}

export interface IPlatformAdapter {
  // ── Filesystem ───────────────────────────────────────────
  /** Read a file's content as a UTF-8 string */
  readFile(path: string): Promise<string>
  /** Write a UTF-8 string to a file, creating it if it doesn't exist */
  writeFile(path: string, content: string): Promise<void>
  /** List directory contents with rich metadata (name, path, isDirectory, isFile) */
  readDir(path: string): Promise<DirEntry[]>
  /** Check whether a file or directory exists */
  exists(path: string): Promise<boolean>

  // ── Project Management ───────────────────────────────────
  /** Open an OS folder picker dialog (Electron: native; Browser: in-app tree). Returns path or null if cancelled. */
  openFolderDialog(): Promise<string | null>
  /** Return the currently stored project root directory path */
  getProjectRoot(): Promise<string>
  /** Persist the project root (localStorage / IPC depending on platform) */
  setProjectRoot(root: string): Promise<void>
  /** Return available filesystem roots (drives on Windows, home+/ on Unix) */
  getFilesystemRoots(): Promise<DirEntry[]>

  // ── Agent Communication ──────────────────────────────────
  /** Send a typed message to the Agent process */
  sendToAgent(message: AgentMessage): Promise<void>
  /**
   * Register a callback for messages received from the Agent process.
   * Returns a cleanup function that removes this specific callback.
   */
  onAgentMessage(callback: (message: AgentMessage) => void): () => void

  // ── Platform Info ────────────────────────────────────────
  /** Return information about the current platform and its capabilities */
  getPlatformInfo(): PlatformInfo
}
