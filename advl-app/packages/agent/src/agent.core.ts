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
import type { AgentMessage, AgentResponsePayload, UseCase, DCM, DCMDocument, AgentAction } from '@advl/shared'
import { AGENT_MESSAGE_TYPES } from '@advl/shared'
import { dcmEngine } from './dcm.engine.js'
import { rulesEngine } from './rules.engine.js'
import { llmClient } from './llm.client.js'
import { scanCodebase } from './tools/codebase-scanner.js'
import { StorageService } from './storage.service.js'
import { loadConfig } from './config.loader.js'

function countViolations(dcm: DCMDocument): number {
  let count = 0
  for (const table of dcm.db_tables ?? []) {
    if (!table.owner_service) count++
    const hasPii = table.fields?.some((f) => f.is_pii) ?? false
    if (hasPii && !table.audit_log) count++
    if (table.retention_days === null || table.retention_days === undefined) count++
  }
  return count
}

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
    const payload = message.payload as { description: string; projectRoot?: string }
    const projectRoot = payload.projectRoot ?? process.env['ADVL_PROJECT_ROOT'] ?? process.cwd()

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
    const payload = message.payload as { prompt: string; history?: Array<{ role: 'user' | 'assistant'; content: string }>; projectRoot?: string }
    // Client sends projectRoot with each query — use it, fall back to env/cwd
    const projectRoot = payload.projectRoot ?? process.env['ADVL_PROJECT_ROOT'] ?? process.cwd()

    console.log(`[Agent][QUERY] "${payload.prompt?.slice(0, 120)}"`)

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
      // ── Build full DCM context ──────────────────────────────────────────────
      let dcmSection = 'No project loaded — no DCM context available.'

      try {
        const d: DCM = await dcmEngine.readDCM(projectRoot)

        // Stack summary
        const stack = d.stack ? Object.entries(d.stack)
          .filter(([, v]) => v != null)
          .map(([k, v]) => `  ${k}: ${String(v)}`)
          .join('\n') : '  (not defined)'

        // All use cases with their functions
        const ucLines = (d.use_cases ?? []).map((uc) => {
          const fns = uc.functions?.length
            ? uc.functions.map((f) => `      - ${f.name} @ ${f.file}:${f.line}${f.endpoint ? ` [${f.endpoint}]` : ''}`).join('\n')
            : '      (no functions registered)'
          return `  [${uc.id}] ${uc.title} (${uc.status})\n    value: ${uc.value}\n    actor: ${uc.actor}\n    functions:\n${fns}`
        }).join('\n\n') || '  (none)'

        // ADRs
        const adrLines = (d.adrs ?? []).map((a) =>
          `  [${a.id}] ${a.title} — ${a.status}: ${a.decision}`
        ).join('\n') || '  (none)'

        dcmSection = `Project: ${d.project ?? 'unknown'} (DCM v${d.version})

TECH STACK:
${stack}

USE CASES (${(d.use_cases ?? []).length} total):
${ucLines}

ARCHITECTURE DECISIONS (ADRs):
${adrLines}`
      } catch {
        // No DCM on disk yet — agent works without it
      }

      // ── System prompt — ADVL-aware, context-rich ───────────────────────────
      const systemPrompt = `You are the ADVL Agent — an engineering collaborator embedded in a structured software development system called ADVL (AI Development Visual Language).

## Your Role
You know the project's full context: its tech stack, all registered use cases, their implementation status, and architectural decisions. You help the developer implement features correctly within their existing system.

## Current Project Context
${dcmSection}

## How You Work
1. **Always use the project's tech stack** — never suggest a different framework or language unless explicitly asked.
2. **Reference existing use cases** — if the user's request matches an existing UC, say so and work within it.
3. **Ask for details when needed** — if you need more info to implement correctly, ask ONE focused question. Don't ask multiple questions at once.
4. **Register new use cases** — if the user describes new functionality not in the DCM, include an ACTION block at the end of your reply to register it.
5. **Deliver working code** — always complete, copy-paste-ready, no TODOs or stubs.
6. **Reply in markdown** — use fenced code blocks with language tags. Never output raw JSON as your main reply.

## Action Protocol
When you need to register a new use case, append this block at the very end of your response (after all prose/code):

\`\`\`advl-action
{
  "type": "register_use_case",
  "payload": {
    "title": "Actor does something",
    "value": "Business value statement",
    "actor": "Developer|User|System",
    "preconditions": ["..."],
    "postconditions": ["..."]
  }
}
\`\`\`

Only include this block if genuinely registering a new UC. Omit it otherwise.`

      // ── Build message array with history ──────────────────────────────────
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
      ]

      // Inject conversation history (last 10 turns max to stay within context)
      const history = payload.history ?? []
      const trimmedHistory = history.slice(-10)
      for (const entry of trimmedHistory) {
        messages.push({ role: entry.role, content: entry.content })
      }

      // Current user message
      messages.push({ role: 'user', content: payload.prompt })

      const rawResponse = await llmClient.complete(messages)
      console.log(`[Agent][QUERY DONE] ${rawResponse.length} chars`)

      // ── Parse optional action block ────────────────────────────────────────
      const actionMatch = rawResponse.match(/```advl-action\n([\s\S]*?)```/)
      let action: AgentAction | undefined
      let displayMessage = rawResponse

      if (actionMatch?.[1]) {
        try {
          action = JSON.parse(actionMatch[1].trim()) as AgentAction
          // Execute the action server-side immediately
          if (action.type === 'register_use_case') {
            const ucPayload = action.payload
            const newUC = await dcmEngine.registerUseCase({
              title: ucPayload.title,
              value: ucPayload.value,
              actor: ucPayload.actor,
              status: 'planned',
              visual_element_id: 'pending',
              functions: [],
              preconditions: ucPayload.preconditions ?? [],
              postconditions: ucPayload.postconditions ?? [],
              rules_applied: [],
              deprecated_date: null,
              deprecated_reason: null,
              replaced_by: null,
            }, projectRoot)
            console.log(`[Agent][ACTION] Registered UC: ${newUC.id} — ${newUC.title}`)
            // Remove the action block from display but add a confirmation line
            displayMessage = rawResponse.replace(/\n?```advl-action[\s\S]*?```/g, '')
              + `\n\n> ✅ Use case **${newUC.id}** registered in DCM: "${newUC.title}"`
            // Return the new UC in data so the store can update the canvas
            return makeResponse(message.id, {
              success: true,
              message: displayMessage,
              data: { use_case: newUC, action },
            })
          }
        } catch (parseErr) {
          console.warn('[Agent][ACTION] Failed to parse action block:', parseErr)
          // Strip broken action block from display
          displayMessage = rawResponse.replace(/\n?```advl-action[\s\S]*?```/g, '')
        }
      }

      return makeResponse(message.id, {
        success: true,
        message: displayMessage,
        data: action ? { action } : undefined,
      })
    } catch (err) {
      console.error(`[Agent][QUERY ERROR]`, err)
      return makeResponse(message.id, { success: false, message: String(err) })
    }
  },

  /**
   * Handle BOOTSTRAP_PROJECT — reverse-engineer an existing codebase into a DCM.
   *
   * Steps:
   *   1. Static scan (regex extraction of endpoints, tables, functions)
   *   2. AI enrichment — derive use cases, table owners, data flows
   *   3. Merge into a full DCMDocument
   *   4. Count violations server-side
   *   5. Return BOOTSTRAP_COMPLETE with dcm + stats
   *
   * UC-011 (Reverse Engineering Bootstrapper)
   */
  async handleBootstrapProject(
    message: AgentMessage,
    sendStatus: (status: string, msg: string) => void,
  ): Promise<AgentMessage> {
    const payload = message.payload as { projectRoot: string }
    const projectRoot = payload.projectRoot ?? process.env['ADVL_PROJECT_ROOT'] ?? process.cwd()

    try {
      sendStatus('scanning', `Scanne ${projectRoot}...`)
      const { dcm: scannedDcm, scanStats } = await scanCodebase(projectRoot)

      let enriched: {
        use_cases?: Array<{ id: string; name: string; endpoints?: string[]; functions?: string[] }>
        table_owners?: Record<string, string>
        data_flows?: Array<{ id: string; source: string; target: string; operation: string }>
      } = {}

      if (llmClient.isConfigured()) {
        sendStatus('ai_enriching', 'AI leitet Use Cases ab...')
        const enrichmentPrompt = `Du bist ein Software-Architekt. Du hast folgenden Code-Scan erhalten:

ENDPOINTS: ${JSON.stringify((scannedDcm.endpoints ?? []).slice(0, 30), null, 2)}
DB_TABLES: ${JSON.stringify((scannedDcm.db_tables ?? []).slice(0, 20), null, 2)}
FUNCTIONS (sample): ${JSON.stringify((scannedDcm.functions ?? []).slice(0, 20), null, 2)}

Aufgabe:
1. Leite 5-15 wahrscheinliche Use Cases ab (was macht diese App?)
2. Verknüpfe jeden Use Case mit den passenden endpoints[] und functions[]
3. Bestimme für jede DB-Tabelle den wahrscheinlichen owner_service
4. Identifiziere data_flows zwischen Endpoints und Tabellen

Antworte NUR mit validem JSON nach diesem Schema:
{
  "use_cases": [{ "id": "uc_001", "name": "...", "endpoints": ["ep_..."], "functions": ["fn_..."] }],
  "table_owners": { "tbl_users": "auth-service" },
  "data_flows": [{ "id": "flow_001", "source": "ep_...", "target": "tbl_...", "operation": "write", "name": "..." }]
}`
        try {
          const aiRaw = await llmClient.complete(enrichmentPrompt)
          const jsonStr = aiRaw.replace(/```json|```/g, '').trim()
          enriched = JSON.parse(jsonStr) as typeof enriched
        } catch {
          // Fallback: unangereichert — violations werden trotzdem markiert
        }
      }

      const today = new Date().toISOString().split('T')[0] ?? ''
      const useCases: UseCase[] = (enriched.use_cases ?? []).map((uc, i) => ({
        id: uc.id ?? `uc_${String(i + 1).padStart(3, '0')}`,
        title: uc.name ?? `Use Case ${i + 1}`,
        name: uc.name,
        value: '(derived by bootstrap scanner — verify and update)',
        status: 'planned' as const,
        visual_element_id: null,
        actor: 'User',
        preconditions: [],
        postconditions: [],
        functions: [],
        rules_applied: [],
        deprecated_date: null,
        deprecated_reason: null,
        replaced_by: null,
      }))

      const finalDcm: DCMDocument = {
        version: '1.0',
        project: scannedDcm.project,
        use_cases: useCases,
        visual_elements: [],
        endpoints: scannedDcm.endpoints,
        functions: scannedDcm.functions,
        db_tables: (scannedDcm.db_tables ?? []).map((table) => ({
          ...table,
          owner_service: enriched.table_owners?.[table.id],
        })),
        data_flows: (enriched.data_flows ?? []).map((f) => ({
          id: f.id,
          name: f.id,
          source: f.source,
          target: f.target,
          operation: (f.operation ?? 'read') as 'read' | 'write' | 'delete' | 'stream',
        })),
      }

      const config = await loadConfig()
      const storage = new StorageService(config)
      const yaml = await import('yaml')
      await storage.writeDCM(yaml.stringify(finalDcm))

      const violationCount = countViolations(finalDcm)

      return {
        id: uuidv4(),
        type: 'BOOTSTRAP_COMPLETE',
        payload: {
          dcm: finalDcm,
          scanStats,
          violationCount,
          message: `Scan komplett: ${scanStats.endpointsFound} Endpoints, ${scanStats.tablesFound} Tabellen, ${violationCount} Violations gefunden`,
          today,
        },
        timestamp: new Date().toISOString(),
        replyTo: message.id,
      }
    } catch (err) {
      return makeResponse(message.id, { success: false, message: String(err) })
    }
  },

  /**
   * Handle FIX_VIOLATION — AI-assisted fix for a single DCM violation.
   *
   * Loads the current DCM, asks the LLM to produce a JSON patch,
   * and returns the AI response. Actual patch application is done
   * by the client after reviewing the suggestion.
   *
   * UC-011 (Reverse Engineering Bootstrapper)
   */
  async handleFixViolation(message: AgentMessage): Promise<AgentMessage> {
    const { violationId, fixPrompt, entityId } = message.payload as {
      violationId: string
      fixPrompt: string
      entityId: string
    }

    if (!llmClient.isConfigured()) {
      return makeResponse(message.id, {
        success: false,
        message: 'LLM API key not configured. Set ADVL_LLM_API_KEY.',
      })
    }

    try {
      const config = await loadConfig()
      const storage = new StorageService(config)
      const dcmContent = await storage.readDCM()

      const prompt = `Du bist ADVL Architekt. Behebe folgende Violation im DCM:

VIOLATION: ${fixPrompt}
ENTITY_ID: ${entityId}

Aktuelles DCM (gekürzt):
${(dcmContent ?? '(nicht verfügbar)').slice(0, 3000)}

Antworte mit einem JSON patch:
{
  "operation": "update_table" | "add_use_case" | "mark_deprecated",
  "target_id": "${entityId}",
  "changes": { "owner_service": "auth-service", "audit_log": true }
}`

      const aiResponse = await llmClient.complete(prompt)
      return makeResponse(message.id, {
        success: true,
        message: aiResponse,
        data: { violationId, entityId },
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
