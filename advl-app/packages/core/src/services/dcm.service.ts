/**
 * services/dcm.service.ts — DCM read/write service
 *
 * Handles reading and writing DCM.yaml via the platform adapter.
 * Parses YAML to/from the typed DCM structure.
 * This service has no UI — it is called by stores and the agent.
 * TODO: Implement readDCM() — read file via platform, parse YAML
 * TODO: Implement writeDCM() — serialize to YAML, write via platform
 * TODO: Add YAML parsing (use 'yaml' package or equivalent)
 */
import type { DCM } from '@advl/shared'
import { DCM_FILENAME, SCHEMA_DIR } from '@advl/shared'
import { platform } from '../platform/adapter.factory'

export const dcmService = {
  /**
   * Read and parse DCM.yaml from the given project root.
   * TODO: Parse YAML string into DCM object (requires 'yaml' package)
   */
  async readDCM(projectRoot: string): Promise<DCM> {
    const dcmPath = `${projectRoot}/${SCHEMA_DIR}/${DCM_FILENAME}`
    const content = await platform.readFile(dcmPath)
    // TODO: Replace with real YAML parsing
    // import { parse } from 'yaml'
    // return parse(content) as DCM
    void content
    throw new Error('TODO: Implement YAML parsing in dcm.service.readDCM()')
  },

  /**
   * Serialize and write DCM to DCM.yaml at the given project root.
   * TODO: Serialize DCM object to YAML string (requires 'yaml' package)
   */
  async writeDCM(projectRoot: string, dcm: DCM): Promise<void> {
    const dcmPath = `${projectRoot}/${SCHEMA_DIR}/${DCM_FILENAME}`
    // TODO: Replace with real YAML serialization
    // import { stringify } from 'yaml'
    // const content = stringify(dcm)
    void dcm
    void dcmPath
    throw new Error('TODO: Implement YAML serialization in dcm.service.writeDCM()')
  },

  /**
   * Check whether a DCM.yaml file exists at the project root.
   */
  async hasDCM(projectRoot: string): Promise<boolean> {
    const dcmPath = `${projectRoot}/${SCHEMA_DIR}/${DCM_FILENAME}`
    return platform.exists(dcmPath)
  },
}
