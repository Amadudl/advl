/**
 * rules.engine.ts — ADVL rulebook loader and compliance checker
 *
 * Loads the MD rulebook files from /rules and provides validation
 * against them. The agent calls this before delivering any output.
 *
 * TODO: Implement full LLM-based rule compliance checking
 * TODO: Implement structural checks (no fake, no duplicate, etc.) without LLM
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
   * TODO: Used by llmClient to build the system prompt with relevant rules
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
   * Validate a subject against ADVL rules.
   * TODO: Implement structural NO_FAKE checks (no empty functions, no mocks)
   * TODO: Implement NO_DUPLICATE check against DCM
   * TODO: Implement USE_CASE_FIRST check (is there a UC reference?)
   */
  async validate(_subject: string, _data: unknown, _projectRoot?: string): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = []
    // TODO: Structural checks without LLM
    // TODO: LLM-based checks for complex rules
    return violations
  },

  /**
   * Build a compact rule summary string for injection into LLM prompts.
   * Returns the key rules that agents must always follow.
   */
  getRuleSummaryForPrompt(): string {
    return `ADVL AGENT RULES (non-negotiable):
1. DCM First: Check DCM before writing any function. Reuse if exists.
2. Use Case Driven: Every function traces to a use case with business value.
3. No Duplicate: Never create a second implementation of existing logic.
4. No Fake: No empty functions, no TODO stubs, no mocks in shipping code.
5. One Solution Per Problem: Use existing stack patterns. ADR for new tech.
6. Explicit Over Implicit: Ask when ambiguous. Never guess business logic.
7. Update DCM in same operation as code. Never separately.`
  },
}
