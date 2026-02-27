/**
 * adapter.factory.ts — Platform adapter factory and singleton
 *
 * The ONLY place in the codebase where environment detection happens.
 * Detects whether we're running inside Electron or a browser and returns
 * the appropriate adapter implementation. Returns a singleton — created
 * once at startup and shared across the entire application.
 *
 * See ARCHITECTURE.md — "Platform Adapter — The Critical Layer"
 */
import { ElectronAdapter } from './adapter.electron'
import { BrowserAdapter } from './adapter.browser'
import type { IPlatformAdapter } from './adapter.interface'

function createPlatformAdapter(): IPlatformAdapter {
  // Electron's preload.ts injects this global flag into the renderer window.
  // It is the single, authoritative signal that we are running in Electron.
  if (typeof window !== 'undefined' && (window as Window & { __ADVL_ELECTRON__?: boolean }).__ADVL_ELECTRON__) {
    return new ElectronAdapter()
  }
  // Default: browser (server-hosted) mode
  return new BrowserAdapter()
}

/**
 * Singleton platform adapter instance.
 * Import this in any component or service that needs platform access.
 *
 * @example
 * import { platform } from '@/platform/adapter.factory'
 * const content = await platform.readFile('/path/to/DCM.yaml')
 */
export const platform: IPlatformAdapter = createPlatformAdapter()
