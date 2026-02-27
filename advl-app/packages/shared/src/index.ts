/**
 * index.ts — Barrel export for @advl/shared
 *
 * Single entry point for all shared types, interfaces, and constants.
 * All other packages import from '@advl/shared' — never from deep paths.
 */

// Types
export * from './types/dcm.types.js'
export * from './types/use-case.types.js'
export * from './types/visual.types.js'
export * from './types/agent.types.js'
export * from './types/platform.types.js'

// Constants
export * from './constants/agent.constants.js'
export * from './constants/advl.constants.js'
