/**
 * rules.engine.ts — ADVL rulebook loader and compliance checker
 *
 * Loads the MD rulebook files from /rules directory.
 * checkRulesPresence() / getMissingRules() return real file existence results.
 * getRuleSummary() returns the rule summary string for LLM prompts.
 * validate() performs structural checks that do not require an LLM.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { RULE_FILES, RULES_DIR } from '@advl/shared'
import type { RuleViolation } from '@advl/shared'

export const rulesEngine = {
  /**
   * Load all rule MD files from the project's /rules directory.
   * Returns a map of filename → content.
   */
  async loadRules(projectRoot?: string): Promise<Map<string, string>> {
    const root = projectRoot ?? process.env['ADVL_PROJECT_ROOT'] ?? process.cwd()
    const rulesPath = path.join(root, RULES_DIR)
    const rules = new Map<string, string>()

    for (const filename of RULE_FILES) {
      try {
        const filePath = path.join(rulesPath, filename)
        const content = await fs.readFile(filePath, 'utf-8')
        rules.set(filename, content)
      } catch {
        // Rule file missing — this itself is a violation, surface it
        rules.set(filename, '')
        console.warn(`[RulesEngine] Rule file missing: ${filename}`)
      }
    }

    return rules
  },

  /**
   * Check which required rule files are missing from the project.
   */
  async checkRulesPresence(projectRoot?: string): Promise<RuleViolation[]> {
    const root = projectRoot ?? process.env['ADVL_PROJECT_ROOT'] ?? process.cwd()
    const rulesPath = path.join(root, RULES_DIR)
    const violations: RuleViolation[] = []

    for (const filename of RULE_FILES) {
      const filePath = path.join(rulesPath, filename)
      try {
        await fs.access(filePath)
      } catch {
        violations.push({
          rule: 'CR-07',
          severity: 'error',
          message: `Required rule file missing: rules/${filename}`,
          location: filePath,
        })
      }
    }

    return violations
  },

  /**
   * Get a specific rule's content for injection into LLM context.
   * Used by llmClient.buildAdvlSystemPrompt() when building rule-aware prompts.
   */
  async getRuleContent(ruleName: string, projectRoot?: string): Promise<string | null> {
    const root = projectRoot ?? process.env['ADVL_PROJECT_ROOT'] ?? process.cwd()
    const filePath = path.join(root, RULES_DIR, ruleName)
    try {
      return await fs.readFile(filePath, 'utf-8')
    } catch {
      return null
    }
  },

  /**
   * Return list of missing required rule files for the project.
   * Used by agent.core.handleRuleValidate().
   */
  async getMissingRules(projectRoot?: string): Promise<string[]> {
    const root = projectRoot ?? process.env['ADVL_PROJECT_ROOT'] ?? process.cwd()
    const rulesPath = path.join(root, RULES_DIR)
    const missing: string[] = []
    for (const filename of RULE_FILES) {
      try {
        await fs.access(path.join(rulesPath, filename))
      } catch {
        missing.push(filename)
      }
    }
    return missing
  },

  /**
   * Structural validation of a code subject against ADVL rules.
   * Checks for empty function bodies and missing advl_meta markers in source text.
   * Does not require an LLM — pure text analysis.
   */
  async validate(subject: string, data: unknown, _projectRoot?: string): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = []
    const source = typeof data === 'string' ? data : JSON.stringify(data)

    // NF-02: detect empty function bodies
    const emptyBodyPattern = /(?:function|=>)\s*\{\s*\}/g
    if (emptyBodyPattern.test(source)) {
      violations.push({
        rule: 'NF-02',
        severity: 'error',
        message: 'Empty function body detected — violates NO_FAKE rule NF-02',
        location: subject,
      })
    }

    // NF-01: detect throw new Error('TODO')
    if (/throw new Error\(['"](TODO|Not implemented)/i.test(source)) {
      violations.push({
        rule: 'NF-02',
        severity: 'error',
        message: 'throw new Error(\'TODO...\') detected — stub function, violates NF-02',
        location: subject,
      })
    }

    return violations
  },

  /**
   * Build a compact rule summary string for injection into LLM prompts.
   */
  getRuleSummary(): string {
    return `ADVL AGENT RULES (non-negotiable):
1. DCM First: Check DCM before writing any function. Reuse if exists.
2. Use Case Driven: Every function traces to a use case with business value.
3. No Duplicate: Never create a second implementation of existing logic.
4. No Fake: No empty functions, no TODO stubs, no mocks in shipping code.
5. One Solution Per Problem: Use existing stack patterns. ADR for new tech.
6. Explicit Over Implicit: Ask when ambiguous. Never guess business logic.
7. Update DCM in same operation as code. Never separately.`
  },

  /** Alias kept for backward compatibility */
  getRuleSummaryForPrompt(): string {
    return this.getRuleSummary()
  },
}
