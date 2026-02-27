/**
 * config.loader.ts — ADVL Config Loader
 *
 * Searches for ADVLConfig in priority order:
 *   1. ADVL_CONFIG env variable (absolute path to config.json)
 *   2. ~/.advl/config.json (Stealth Mode default)
 *   3. {cwd}/.advl/config.json (project-local opt-in)
 *   4. Environment variable defaults (development fallback)
 *
 * UC-012 / Stealth Mode Storage
 */
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import type { ADVLConfig } from '@advl/shared'

async function tryReadJson(filePath: string): Promise<ADVLConfig | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content) as ADVLConfig
  } catch {
    return null
  }
}

export async function loadConfig(): Promise<ADVLConfig> {
  const envPath = process.env['ADVL_CONFIG']
  if (envPath) {
    const cfg = await tryReadJson(envPath)
    if (cfg) return cfg
  }

  const userHomeCfg = await tryReadJson(path.join(os.homedir(), '.advl', 'config.json'))
  if (userHomeCfg) return userHomeCfg

  const localCfg = await tryReadJson(path.join(process.cwd(), '.advl', 'config.json'))
  if (localCfg) return localCfg

  return {
    storageMode: 'user-home',
    userHomeSubdir: '.advl',
    targetProjectRoot: process.env['ADVL_PROJECT_ROOT'] ?? process.cwd(),
    llm: {
      provider: (process.env['ADVL_LLM_PROVIDER'] as ADVLConfig['llm']['provider']) ?? 'openrouter',
      model: process.env['ADVL_LLM_MODEL'] ?? 'anthropic/claude-sonnet-4-5',
      apiKey: process.env['ADVL_LLM_API_KEY'] ?? '',
    },
  }
}
