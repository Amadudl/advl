/**
 * storage.service.ts — ADVL Storage Service
 *
 * Resolves where ADVL stores its DCM and rules files based on ADVLConfig.
 * Supports three modes:
 *   'project'  — .advl/ inside the target project directory (visible in repo)
 *   'external' — absolute path specified in config
 *   'user-home' — ~/.advl/{projectKey}/ (Stealth Mode, default)
 *
 * UC-012 / Stealth Mode Storage
 */
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import type { ADVLConfig } from '@advl/shared'

export class StorageService {
  private readonly config: ADVLConfig
  private readonly storageRoot: string

  constructor(config: ADVLConfig) {
    this.config = config
    this.storageRoot = this.resolveStorageRoot()
  }

  private resolveStorageRoot(): string {
    switch (this.config.storageMode) {
      case 'external':
        if (!this.config.externalStoragePath) {
          throw new Error('[StorageService] storageMode=external requires externalStoragePath')
        }
        return this.config.externalStoragePath
      case 'user-home':
        return path.join(
          os.homedir(),
          this.config.userHomeSubdir ?? '.advl',
          this.projectKey(),
        )
      case 'project':
      default:
        return path.join(this.config.targetProjectRoot, '.advl')
    }
  }

  private projectKey(): string {
    const hash = Buffer.from(this.config.targetProjectRoot)
      .toString('base64')
      .replace(/[/+=]/g, '_')
      .slice(0, 20)
    return `proj_${hash}`
  }

  async ensureStorage(): Promise<void> {
    await fs.mkdir(this.storageRoot, { recursive: true })
  }

  async readDCM(): Promise<string | null> {
    const dcmPath = path.join(this.storageRoot, 'DCM.yaml')
    return fs.readFile(dcmPath, 'utf-8').catch(() => null)
  }

  async writeDCM(content: string): Promise<void> {
    await this.ensureStorage()
    const dcmPath = path.join(this.storageRoot, 'DCM.yaml')
    await fs.writeFile(dcmPath, content, 'utf-8')
  }

  async readRules(): Promise<string[]> {
    const rulesPath = path.join(this.storageRoot, 'rules')
    try {
      const files = await fs.readdir(rulesPath)
      const mdFiles = files.filter((f) => f.endsWith('.md'))
      return Promise.all(
        mdFiles.map((f) => fs.readFile(path.join(rulesPath, f), 'utf-8')),
      )
    } catch {
      return []
    }
  }

  getStorageInfo(): { root: string; mode: ADVLConfig['storageMode']; isVisible: boolean } {
    return {
      root: this.storageRoot,
      mode: this.config.storageMode,
      isVisible: this.config.storageMode === 'project',
    }
  }
}
