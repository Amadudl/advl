/**
 * tools/rules.tool.ts — Agent tool: Check compliance against ADVL rulebooks
 *
 * Exposes rule compliance checking as a function-calling tool for the LLM.
 * The agent calls this before finalizing any output per AGENTS.md Rule 7.
 * TODO: Wire into llmClient tool_choice parameter
 */
import { rulesEngine } from '../rules.engine.js'

export const rulesToolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'check_rule_compliance',
      description: 'Validate an implementation against ADVL rulebooks. Call before delivering any code output.',
      parameters: {
        type: 'object',
        properties: {
          subject: {
            type: 'string',
            enum: ['function', 'use_case', 'visual_element', 'dcm'],
            description: 'What is being validated',
          },
          data: {
            type: 'object',
            description: 'The subject to validate (function definition, use case entry, etc.)',
          },
        },
        required: ['subject', 'data'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_rule_content',
      description: 'Get the content of a specific ADVL rule file for reference.',
      parameters: {
        type: 'object',
        properties: {
          rule_file: {
            type: 'string',
            enum: ['CORE_RULES.md', 'NO_DUPLICATE.md', 'USE_CASE_FIRST.md', 'META_INJECTION.md', 'STACK_RULES.md', 'NO_FAKE.md'],
          },
        },
        required: ['rule_file'],
      },
    },
  },
]

export async function executeRulesTool(
  toolName: string,
  args: Record<string, unknown>,
  projectRoot?: string,
): Promise<string> {
  switch (toolName) {
    case 'check_rule_compliance': {
      const violations = await rulesEngine.validate(
        args['subject'] as string,
        args['data'],
        projectRoot,
      )
      return JSON.stringify({
        passed: violations.length === 0,
        violations,
      })
    }

    case 'get_rule_content': {
      const content = await rulesEngine.getRuleContent(
        args['rule_file'] as string,
        projectRoot,
      )
      return JSON.stringify({
        found: content !== null,
        content: content ?? 'Rule file not found in project',
      })
    }

    default:
      return JSON.stringify({ error: `Unknown rules tool: ${toolName}` })
  }
}
