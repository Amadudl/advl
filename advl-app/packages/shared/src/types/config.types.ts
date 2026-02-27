/**
 * config.types.ts — ADVL configuration types
 *
 * Defines the ADVLConfig interface and the config file search order.
 * Used by the agent startup to locate and load the configuration.
 */

export interface ADVLConfig {
  storageMode: 'project' | 'external' | 'user-home'
  externalStoragePath?: string
  userHomeSubdir?: string
  targetProjectRoot: string
  llm: {
    provider: 'openrouter' | 'anthropic' | 'openai'
    model: string
    apiKey: string
  }
}

export const CONFIG_SEARCH_ORDER = [
  'env:ADVL_CONFIG',
  'user-home:.advl/config.json',
  'project:.advl/config.json',
] as const
