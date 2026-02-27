/**
 * services/dcm.service.ts — DCM read/write service
 *
 * Handles reading and writing DCM.yaml via the platform adapter.
 * Uses the 'yaml' package for parsing and serialization.
 * Called by dcm.store and project.service — no UI dependencies.
 */
import { parse, stringify } from 'yaml'
import type { DCM } from '@advl/shared'
import { DCM_FILENAME, SCHEMA_DIR } from '@advl/shared'
import { platform } from '../platform/adapter.factory'

export const dcmService = {
  /**
   * Read and parse DCM.yaml from the given project root.
   */
  async readDCM(projectRoot: string): Promise<DCM> {
    const dcmPath = `${projectRoot}/${SCHEMA_DIR}/${DCM_FILENAME}`
    const content = await platform.readFile(dcmPath)
    return parse(content) as DCM
  },

  /**
   * Serialize and write DCM to DCM.yaml at the given project root.
   */
  async writeDCM(projectRoot: string, dcm: DCM): Promise<void> {
    const dcmPath = `${projectRoot}/${SCHEMA_DIR}/${DCM_FILENAME}`
    const updated: DCM = {
      ...dcm,
      last_updated: new Date().toISOString().split('T')[0] ?? dcm.last_updated,
    }
    const content = stringify(updated, { lineWidth: 120 })
    await platform.writeFile(dcmPath, content)
  },

  /**
   * Check whether a DCM.yaml file exists at the project root.
   */
  async hasDCM(projectRoot: string): Promise<boolean> {
    const dcmPath = `${projectRoot}/${SCHEMA_DIR}/${DCM_FILENAME}`
    return platform.exists(dcmPath)
  },
}
