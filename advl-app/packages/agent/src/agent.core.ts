/**
 * agent.core.ts — ADVL agent message handlers
 *
 * Receives typed messages from index.ts and orchestrates:
 *   - DCM queries (exact endpoint match via dcmEngine)
 *   - DCM updates (register new use cases via dcmEngine)
 *   - Rule compliance checks (load rule files, report missing/present)
 *   - Metadata injection (read file, inject advl_meta block, write back)
 *   - Use case submission and code generation (requires LLM API key)
 *
 * Every handler follows ADVL rules: DCM-first, use-case-driven, no duplication.
 */
import fs from 'node:fs/promises'
import { v4 as uuidv4 } from 'uuid'
import type { AgentMessage, AgentResponsePayload, UseCase } from '@advl/shared'
import { AGENT_MESSAGE_TYPES } from '@advl/shared'
import { dcmEngine } from './dcm.engine.js'
import { rulesEngine } from './rules.engine.js'
import { llmClient, buildAdvlSystemPrompt } from './llm.client.js'

function makeResponse(replyTo: string, payload: AgentResponsePayload): AgentMessage {
  return {
    id: uuidv4(),
    type: AGENT_MESSAGE_TYPES.AGENT_RESPONSE,
    payload,
    timestamp: new Date().toISOString(),
    replyTo,
  }
}

export const agentCore = {
  /**
   * Handle USE_CASE_SUBMIT — primary ADVL workflow entry point.
   *
   * Flow (AGENTS.md Rule 1 + Rule 2):
   * 1. Check DCM for existing use cases that match the description (via LLM)
   * 2. If match → return reuse reference, do not register duplicate
   * 3. If no match → register new UC in DCM → trigger CODE_GENERATE
   *
   * Requires ADVL_LLM_API_KEY. Returns an error message if not configured.
   */
  async handleUseCaseSubmit(message: AgentMessage): Promise<AgentMessage> {
    const payload = message.payload as { description: string }
    const projectRoot = process.env['ADVL_PROJECT_ROOT'] ?? process.cwd()

    if (!llmClient.isConfigured()) {
      return makeResponse(message.id, {
        success: false,
        message: 'LLM API key not configured. Set ADVL_LLM_API_KEY in your .env file to enable use case processing.',
      })
    }

    try {
      const ruleSummary = rulesEngine.getRuleSummary()
      const dcm = await dcmEngine.readDCM(projectRoot)
      const existingUCs = dcm.use_cases.map((uc) => `${uc.id}: ${uc.title} — ${uc.value}`).join('\n')

      const systemPrompt = `You are the ADVL agent. ${ruleSummary}

Current DCM use cases:
${existingUCs || '(none)'}

Your task: Given the submitted description, determine if it matches an existing use case or is genuinely new.
Respond with JSON: { "is_duplicate": boolean, "matched_id": string | null, "title": string, "value": string, "actor": string }`

      const response = await llmClient.complete([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: payload.description },
      ])

      let parsed: { is_duplicate: boolean; matched_id: string | null; title: string; value: string; actor: string }
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/)
        parsed = JSON.parse(jsonMatch?.[0] ?? '{}') as typeof parsed
      } catch {
        return makeResponse(message.id, {
          success: false,
          message: `LLM returned non-JSON response: ${response.slice(0, 200)}`,
        })
      }

      if (parsed.is_duplicate && parsed.matched_id) {
        return makeResponse(message.id, {
          success: true,
          message: `Reusing existing use case: ${parsed.matched_id}. No new registration needed.`,
          data: { reuse: true, matched_id: parsed.matched_id },
        })
      }

      const newUC = await dcmEngine.registerUseCase({
        title: parsed.title,
        value: parsed.value,
        actor: parsed.actor,
        status: 'planned',
        visual_element_id: 'pending',
        functions: [],
        preconditions: [],
        postconditions: [],
        rules_applied: [],
        deprecated_date: null,
        deprecated_reason: null,
        replaced_by: null,
      }, projectRoot)

      return makeResponse(message.id, {
        success: true,
        message: `Registered new use case: ${newUC.id} — "${newUC.title}"\nValue: ${newUC.value}\nStatus: planned`,
        data: { use_case: newUC },
      })
    } catch (err) {
      return makeResponse(message.id, { success: false, message: String(err) })
    }
  },

  /**
   * Handle DCM_QUERY — check if an endpoint already exists in the DCM.
   * Uses exact string match (real implementation in dcmEngine.queryEndpoint).
   */
  async handleDCMQuery(message: AgentMessage): Promise<AgentMessage> {
    const payload = message.payload as { method?: string; path?: string; intent?: string }
    const projectRoot = process.env['ADVL_PROJECT_ROOT'] ?? process.cwd()

    try {
      if (payload.method && payload.path) {
        const result = await dcmEngine.queryEndpoint(payload.method, payload.path, projectRoot)
        return makeResponse(message.id, { success: true, data: result })
      }

      return makeResponse(message.id, {
        success: false,
        message: 'DCM_QUERY requires method and path fields for endpoint lookup. Semantic intent query requires LLM.',
      })
    } catch (err) {
      return makeResponse(message.id, { success: false, message: String(err) })
    }
  },

  /**
   * Handle DCM_UPDATE — register or update a use case in DCM.yaml.
   * Reads the current DCM, applies the change, writes it back to disk.
   */
  async handleDCMUpdate(message: AgentMessage): Promise<AgentMessage> {
    const payload = message.payload as { type: string; use_case?: Partial<UseCase> }
    const projectRoot = process.env['ADVL_PROJECT_ROOT'] ?? process.cwd()

    try {
      if (payload.type === 'use_case_created' && payload.use_case) {
        const newUC = await dcmEngine.registerUseCase(
          payload.use_case as Omit<UseCase, 'id'>,
          projectRoot,
        )
        return makeResponse(message.id, {
          success: true,
          message: `Registered ${newUC.id}: ${newUC.title}`,
          data: { use_case: newUC },
        })
      }

      if (payload.type === 'use_case_updated' && payload.use_case?.id) {
        const dcm = await dcmEngine.readDCM(projectRoot)
        const idx = dcm.use_cases.findIndex((uc) => uc.id === payload.use_case?.id)
        if (idx === -1) {
          return makeResponse(message.id, {
            success: false,
            message: `Use case ${payload.use_case.id} not found in DCM`,
          })
        }
        dcm.use_cases[idx] = { ...dcm.use_cases[idx], ...payload.use_case } as UseCase
        await dcmEngine.writeDCM(dcm, projectRoot)
        return makeResponse(message.id, {
          success: true,
          message: `Updated ${payload.use_case.id} in DCM`,
        })
      }

      return makeResponse(message.id, {
        success: false,
        message: `Unknown DCM_UPDATE type: "${payload.type}". Valid types: use_case_created, use_case_updated`,
      })
    } catch (err) {
      return makeResponse(message.id, { success: false, message: String(err) })
    }
  },

  /**
   * Handle META_INJECT — inject advl_meta JSON into a visual element in a source file.
   * Reads the target file, finds the component, injects the metadata block, writes back.
   */
  async handleMetaInject(message: AgentMessage): Promise<AgentMessage> {
    const payload = message.payload as {
      file: string
      component: string
      meta: Record<string, unknown>
    }

    if (!payload.file || !payload.component || !payload.meta) {
      return makeResponse(message.id, {
        success: false,
        message: 'META_INJECT requires: file (path), component (name), meta (advl_meta object)',
      })
    }

    try {
      let content = await fs.readFile(payload.file, 'utf-8')

      const metaBlock = `\n  advl_meta: ${JSON.stringify(payload.meta, null, 4).replace(/\n/g, '\n  ')},`
      const componentPattern = new RegExp(`(export\\s+(?:function|const)\\s+${payload.component}[^{]*\\{)`)

      if (!componentPattern.test(content)) {
        return makeResponse(message.id, {
          success: false,
          message: `Component "${payload.component}" not found in ${payload.file}`,
        })
      }

      const alreadyInjected = content.includes('advl_meta:')
      if (alreadyInjected) {
        return makeResponse(message.id, {
          success: true,
          message: `advl_meta already present in ${payload.file} — no changes made`,
        })
      }

      content = content.replace(componentPattern, `$1${metaBlock}`)
      await fs.writeFile(payload.file, content, 'utf-8')

      return makeResponse(message.id, {
        success: true,
        message: `Injected advl_meta into ${payload.component} in ${payload.file}`,
      })
    } catch (err) {
      return makeResponse(message.id, { success: false, message: String(err) })
    }
  },

  /**
   * Handle CODE_GENERATE — generate implementation for a registered use case via LLM.
   * Requires ADVL_LLM_API_KEY. Loads UC from DCM, builds ADVL-rules-aware prompt.
   */
  async handleCodeGenerate(message: AgentMessage): Promise<AgentMessage> {
    const payload = message.payload as { use_case_id: string }
    const projectRoot = process.env['ADVL_PROJECT_ROOT'] ?? process.cwd()

    if (!llmClient.isConfigured()) {
      return makeResponse(message.id, {
        success: false,
        message: 'LLM API key not configured. Set ADVL_LLM_API_KEY in your .env file.',
      })
    }

    if (!payload.use_case_id) {
      return makeResponse(message.id, {
        success: false,
        message: 'CODE_GENERATE requires use_case_id',
      })
    }

    try {
      const dcm = await dcmEngine.readDCM(projectRoot)
      const uc = dcm.use_cases.find((u) => u.id === payload.use_case_id)

      if (!uc) {
        return makeResponse(message.id, {
          success: false,
          message: `Use case ${payload.use_case_id} not found in DCM. Register it first.`,
        })
      }

      const ruleSummary = rulesEngine.getRuleSummary()
      const prompt = `${ruleSummary}

Generate implementation for this ADVL use case:
ID: ${uc.id}
Title: ${uc.title}
Value: ${uc.value}
Actor: ${uc.actor}
Status: ${uc.status}

Stack: ${JSON.stringify(dcm.stack)}

Provide the implementation as TypeScript code with:
1. The function(s) required
2. Registration details for DCM.yaml (file, line, endpoint if applicable)
3. advl_meta block for any visual element that connects to this function`

      const response = await llmClient.complete([
        { role: 'user', content: prompt },
      ])

      return makeResponse(message.id, {
        success: true,
        message: response,
        data: { use_case_id: uc.id },
      })
    } catch (err) {
      return makeResponse(message.id, { success: false, message: String(err) })
    }
  },

  /**
   * Handle AGENT_QUERY — free-form natural language query to the ADVL agent.
   *
   * Loads the current DCM from disk to inject as context into the system prompt.
   * Passes the user's prompt through the LLM with the full ADVL identity +
   * rulebook + live DCM state as system context.
   *
   * If LLM is not configured, returns a structured no-key error so the UI
   * can display a clear actionable message rather than a silent failure.
   *
   * UC-003 / VE-AgentChat-Submit
   */
  async handleAgentQuery(message: AgentMessage): Promise<AgentMessage> {
    const payload = message.payload as { prompt: string }
    const projectRoot = process.env['ADVL_PROJECT_ROOT'] ?? process.cwd()

    if (!payload.prompt?.trim()) {
      return makeResponse(message.id, {
        success: false,
        message: 'AGENT_QUERY requires a non-empty prompt field.',
      })
    }

    if (!llmClient.isConfigured()) {
      return makeResponse(message.id, {
        success: false,
        message: [
          'No LLM API key configured.',
          'Set ADVL_LLM_API_KEY in your .env file to enable natural language queries.',
          '',
          'Supported providers (set ADVL_LLM_PROVIDER):',
          '  openrouter (default) — https://openrouter.ai',
          '  anthropic            — https://api.anthropic.com',
          '  openai               — https://api.openai.com',
        ].join('\n'),
      })
    }

    try {
      let dcm
      try {
        dcm = await dcmEngine.readDCM(projectRoot)
      } catch {
        dcm = undefined
      }

      const systemPrompt = buildAdvlSystemPrompt(dcm)
      const response = await llmClient.complete(payload.prompt, systemPrompt)

      return makeResponse(message.id, {
        success: true,
        message: response,
      })
    } catch (err) {
      return makeResponse(message.id, { success: false, message: String(err) })
    }
  },

  /**
   * Handle RULE_VALIDATE — check which ADVL rule files are present in the project.
   * Returns a list of present and missing rule files with their load status.
   */
  async handleRuleValidate(message: AgentMessage): Promise<AgentMessage> {
    const payload = message.payload as { subject?: string }
    const projectRoot = process.env['ADVL_PROJECT_ROOT'] ?? process.cwd()

    try {
      const rules = await rulesEngine.loadRules(projectRoot)
      const missing = await rulesEngine.getMissingRules(projectRoot)
      const present = Array.from(rules.keys())

      return makeResponse(message.id, {
        success: missing.length === 0,
        message: missing.length === 0
          ? `All ${present.length} rule files present`
          : `Missing rule files: ${missing.join(', ')}`,
        data: {
          subject: payload.subject ?? 'project',
          present,
          missing,
          violations: missing.map((f) => ({
            rule: 'CR-03',
            severity: 'error',
            message: `Missing rule file: ${f}`,
            location: projectRoot,
          })),
        },
      })
    } catch (err) {
      return makeResponse(message.id, { success: false, message: String(err) })
    }
  },
}
