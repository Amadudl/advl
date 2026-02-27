/**
 * platform.types.ts — Platform capability and info types
 *
 * Describes what the current runtime environment supports.
 * Used by the Platform Adapter Layer to advertise capabilities to Core.
 * See /packages/core/src/platform/adapter.interface.ts for the adapter contract.
 */

export type PlatformMode = 'electron' | 'browser' | 'server'

export type PlatformCapability =
  | 'local-filesystem'    // Direct access to local OS filesystem
  | 'native-dialogs'      // OS-native open/save dialogs
  | 'offline'             // Can operate without internet (except LLM calls)
  | 'multi-user'          // Multiple users can connect simultaneously

export interface PlatformInfo {
  mode: PlatformMode
  version: string
  capabilities: PlatformCapability[]
}

export interface FileSystemEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  lastModified?: string
}

export interface ProjectInfo {
  name: string
  root: string
  dcmPath: string
  rulesPath: string
  hasExistingDCM: boolean
}
