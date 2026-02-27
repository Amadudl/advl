/**
 * services/project.service.ts — Project open/save/manage service
 *
 * Handles opening, closing, and initializing ADVL projects via the platform adapter.
 * A project is any directory containing a /schema/DCM.yaml file.
 *
 * UC-001: openProjectDialog() — folder dialog → validate DCM presence → return ProjectInfo
 * UC-005: initProject()       — scaffold /schema/DCM.yaml + /rules stubs in a target directory
 */
import type { ProjectInfo } from '@advl/shared'
import { DCM_FILENAME, SCHEMA_DIR, RULES_DIR, RULE_FILES, STACK_TEMPLATES } from '@advl/shared'
import type { StackTemplateId } from '@advl/shared'
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
   */
  async checkRulesPresence(projectRoot: string): Promise<string[]> {
    const missing: string[] = []
    for (const ruleFile of RULE_FILES) {
      const exists = await platform.exists(`${projectRoot}/${RULES_DIR}/${ruleFile}`)
      if (!exists) missing.push(ruleFile)
    }
    return missing
  },

  /**
   * UC-005: Initialize a new ADVL project at targetPath.
   *
   * Creates:
   *   <targetPath>/schema/DCM.yaml  — seeded with templateId stack values
   *   <targetPath>/rules/<FILE>.md  — stub for each of the 6 ADVL rule files
   *
   * Errors thrown:
   *   "DIRECTORY_NOT_EMPTY"  — targetPath already contains a DCM.yaml
   *   "WRITE_FAILED:<msg>"   — filesystem write error
   *
   * Returns ProjectInfo on success (hasExistingDCM = true).
   */
  async initProject(targetPath: string, templateId: StackTemplateId, projectName: string): Promise<ProjectInfo> {
    const dcmPath = `${targetPath}/${SCHEMA_DIR}/${DCM_FILENAME}`

    const alreadyExists = await platform.exists(dcmPath)
    if (alreadyExists) {
      throw new Error('DIRECTORY_NOT_EMPTY')
    }

    const template = STACK_TEMPLATES[templateId]
    const today = new Date().toISOString().split('T')[0] ?? '2026-01-01'

    const dcmContent = [
      `version: "1.0"`,
      `project: "${projectName}"`,
      `description: "ADVL project initialised from ${template.label} template"`,
      `author: ""`,
      `created: "${today}"`,
      `last_updated: "${today}"`,
      ``,
      `stack:`,
      ...Object.entries(template.stack).map(([k, v]) => {
        if (v === null) return `  ${k}: null`
        if (typeof v === 'boolean') return `  ${k}: ${v}`
        return `  ${k}: "${v}"`
      }),
      ``,
      `use_cases: []`,
      ``,
      `adrs: []`,
      ``,
      `deprecated: []`,
      ``,
      `snapshots: []`,
    ].join('\n')

    try {
      await platform.writeFile(dcmPath, dcmContent)
    } catch (err) {
      throw new Error(`WRITE_FAILED:${String(err)}`)
    }

    const ruleStubs: Record<string, string> = {
      'CORE_RULES.md': '# CORE_RULES\n\nSee https://github.com/Amadudl/advl for full rulebook.\n',
      'NO_DUPLICATE.md': '# NO_DUPLICATE\n\nSee https://github.com/Amadudl/advl for full rulebook.\n',
      'USE_CASE_FIRST.md': '# USE_CASE_FIRST\n\nSee https://github.com/Amadudl/advl for full rulebook.\n',
      'META_INJECTION.md': '# META_INJECTION\n\nSee https://github.com/Amadudl/advl for full rulebook.\n',
      'STACK_RULES.md': '# STACK_RULES\n\nSee https://github.com/Amadudl/advl for full rulebook.\n',
      'NO_FAKE.md': '# NO_FAKE\n\nSee https://github.com/Amadudl/advl for full rulebook.\n',
    }

    for (const ruleFile of RULE_FILES) {
      const stub = ruleStubs[ruleFile] ?? `# ${ruleFile}\n`
      try {
        await platform.writeFile(`${targetPath}/${RULES_DIR}/${ruleFile}`, stub)
      } catch (err) {
        throw new Error(`WRITE_FAILED:${String(err)}`)
      }
    }

    return projectService.loadProject(targetPath)
  },
}
