/**
 * services/project.service.ts — Project open/save/manage service
 *
 * Handles opening and closing ADVL projects via the platform adapter.
 * A project is any directory containing a /schema/DCM.yaml file.
 * TODO: Implement openProject() — trigger folder dialog, validate DCM exists
 * TODO: Implement initProject() — create DCM.yaml + /rules scaffold for new projects
 * TODO: Implement getRecentProjects() — read from persisted recent projects list
 */
import type { ProjectInfo } from '@advl/shared'
import { DCM_FILENAME, SCHEMA_DIR, RULES_DIR, RULE_FILES } from '@advl/shared'
import { platform } from '../platform/adapter.factory'

export const projectService = {
  /**
   * Open a folder dialog and validate the selected directory is an ADVL project.
   * Returns ProjectInfo if valid, null if cancelled or invalid.
   */
  async openProjectDialog(): Promise<ProjectInfo | null> {
    const rootPath = await platform.openFolderDialog()
    if (!rootPath) return null
    return projectService.loadProject(rootPath)
  },

  /**
   * Load a project from a known root path.
   * Checks for existence of DCM.yaml.
   */
  async loadProject(rootPath: string): Promise<ProjectInfo> {
    const dcmPath = `${rootPath}/${SCHEMA_DIR}/${DCM_FILENAME}`
    const hasExistingDCM = await platform.exists(dcmPath)
    const name = rootPath.split(/[/\\]/).pop() ?? rootPath

    return {
      name,
      root: rootPath,
      dcmPath,
      rulesPath: `${rootPath}/${RULES_DIR}`,
      hasExistingDCM,
    }
  },

  /**
   * Check whether all required rule files are present in the project.
   * Returns a list of missing rule files.
   * TODO: Surface missing rules as a warning in the workspace panel
   */
  async checkRulesPresence(projectRoot: string): Promise<string[]> {
    const missing: string[] = []
    for (const ruleFile of RULE_FILES) {
      const exists = await platform.exists(`${projectRoot}/${RULES_DIR}/${ruleFile}`)
      if (!exists) missing.push(ruleFile)
    }
    return missing
  },
}
