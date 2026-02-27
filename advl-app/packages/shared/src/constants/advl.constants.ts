/**
 * advl.constants.ts — Application-wide ADVL constants
 *
 * Version identifiers, schema versions, and other system-level constants.
 * These values are read by multiple packages — define once, import everywhere.
 */

export const ADVL_VERSION = '0.1.0'

export const DCM_SCHEMA_VERSION = '1.0'

export const DCM_FILENAME = 'DCM.yaml'

export const RULES_DIR = 'rules'

export const SCHEMA_DIR = 'schema'

export const RULE_FILES = [
  'CORE_RULES.md',
  'NO_DUPLICATE.md',
  'USE_CASE_FIRST.md',
  'META_INJECTION.md',
  'STACK_RULES.md',
  'NO_FAKE.md',
] as const

export const DEFAULT_AGENT_PORT = 7433

export const DEFAULT_SERVER_PORT = 3000

/** The global injected by Electron's preload.ts to signal desktop mode */
export const ELECTRON_GLOBAL_KEY = '__ADVL_ELECTRON__'

/** IPC channel names used between Electron renderer and main process */
export const IPC_CHANNELS = {
  READ_FILE: 'advl:read-file',
  WRITE_FILE: 'advl:write-file',
  READ_DIR: 'advl:read-dir',
  EXISTS: 'advl:exists',
  OPEN_FOLDER_DIALOG: 'advl:open-folder-dialog',
  GET_PROJECT_ROOT: 'advl:get-project-root',
} as const
