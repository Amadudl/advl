/**
 * llm.client.ts — LLM API client for the ADVL agent
 *
 * Configured for OpenRouter (provider-agnostic) by default.
 * OpenRouter uses the OpenAI SDK interface, so swapping providers
 * requires only changing the baseURL and API key.
 *
 * Model and provider are configurable via environment variables:
 *   ADVL_LLM_PROVIDER — openrouter | anthropic | openai
 *   ADVL_LLM_MODEL    — model identifier (e.g. anthropic/claude-sonnet-4-6)
 *   ADVL_LLM_API_KEY  — API key for the selected provider
 *
 * UC-003 — VE-AgentChat-Submit
 * UC-007 — agent code generation loop
 */
import OpenAI from 'openai'
import type { DCM } from '@advl/shared'

const PROVIDER_URLS: Record<string, string> = {
  openrouter: 'https://openrouter.ai/api/v1',
  anthropic: 'https://api.anthropic.com/v1',
  openai: 'https://api.openai.com/v1',
}

function createClient(): OpenAI {
  const provider = process.env['ADVL_LLM_PROVIDER'] ?? 'openrouter'
  const apiKey = process.env['ADVL_LLM_API_KEY']
  const baseURL = PROVIDER_URLS[provider] ?? PROVIDER_URLS['openrouter']

  if (!apiKey) {
    console.warn('[LLMClient] ADVL_LLM_API_KEY is not set — LLM calls will fail')
  }

  return new OpenAI({
    apiKey: apiKey ?? 'not-set',
    baseURL,
    defaultHeaders: provider === 'openrouter'
      ? {
          'HTTP-Referer': 'https://advl.dev',
          'X-Title': 'ADVL Agent',
        }
      : undefined,
  })
}

const client = createClient()
const DEFAULT_MODEL = process.env['ADVL_LLM_MODEL'] ?? 'anthropic/claude-sonnet-4-6'

/**
 * Build the canonical ADVL system prompt.
 *
 * Structure (UC-003 requirement — prompt must include system instructions +
 * context + user input, not a placeholder string):
 *   1. Role definition + ADVL operating principles
 *   2. Current DCM state (project, stack, use cases with status + function count)
 *   3. ADVL rulebook summary (non-negotiable constraints)
 *   4. Response format instructions for structured agent replies
 *
 * UC-003 / VE-AgentChat-Submit
 */
export function buildAdvlSystemPrompt(dcmContext?: DCM): string {
  const dcmSection = dcmContext
    ? `
## Current DCM State
Project: ${dcmContext.project ?? 'unknown'}
Stack: ${JSON.stringify(dcmContext.stack ?? {})}

Registered Use Cases (${dcmContext.use_cases.length}):
${dcmContext.use_cases
  .map(
    (uc) =>
      `  ${uc.id} [${uc.status}] ${uc.title}\n` +
      `    Value: ${uc.value}\n` +
      `    Actor: ${uc.actor}\n` +
      `    Functions: ${uc.functions.length}`,
  )
  .join('\n')}
`
    : `
## DCM State
No project loaded. Operating without DCM context.
All new use cases will be planned only — no DCM writes without a loaded project.
`

  return `You are the ADVL Agent — a disciplined engineering collaborator inside the ADVL \
(AI Development Visual Language) system.

## Operating Identity
- You think in USE CASES and BUSINESS VALUE, never in raw technical tasks.
- Every function you propose MUST trace to a use case in the DCM.
- You NEVER duplicate existing logic. Always check the DCM first.
- You NEVER produce fake implementations (no TODOs, no empty stubs).
- You are explicit. When ambiguous, you ask. You do not guess business logic.
- All decisions you make are traceable. You name every architectural choice.
${dcmSection}
## ADVL Rulebook (non-negotiable)
1. DCM First — query DCM before any new function. Reuse if found.
2. Use Case Driven — no function without a UC with a business value statement.
3. No Duplicate — one implementation per problem. ADR for exceptions.
4. No Fake — no empty bodies, no TODO stubs, no mocks in shipping code.
5. Foundation Sacred — never touch auth / CI / security without explicit instruction.
6. Explicit Over Implicit — ADVL CLARIFICATION REQUIRED format when ambiguous.
7. DCM Synchronicity — DCM updated in same operation as code, never after.

## Response Format
For use case submissions, return structured JSON:
{
  "intent": "use_case_register" | "use_case_reuse" | "code_generate" | "query_answer",
  "data": { ... }
}
For general queries and code generation, reply in clear markdown.
Always reference use case IDs when applicable (e.g. UC-001).`
}

export const llmClient = {
  /**
   * Returns true if ADVL_LLM_API_KEY is set in environment.
   */
  isConfigured(): boolean {
    return !!process.env['ADVL_LLM_API_KEY']
  },

  /**
   * Send a completion request to the configured LLM.
   *
   * Overload A: messages array — caller controls the full conversation.
   * Overload B: string prompt — wraps with ADVL system prompt.
   *   Pass a DCM object as second arg to inject live DCM state into the prompt.
   *   Pass a string as second arg to use a custom system prompt verbatim.
   *
   * Retries once on rate-limit (429) with 2 s backoff.
   *
   * UC-003 / VE-AgentChat-Submit
   */
  async complete(
    messagesOrPrompt: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> | string,
    systemPromptOrDCM?: string | DCM,
  ): Promise<string> {
    let messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>

    if (typeof messagesOrPrompt === 'string') {
      let system: string
      if (typeof systemPromptOrDCM === 'string') {
        system = systemPromptOrDCM
      } else {
        system = buildAdvlSystemPrompt(systemPromptOrDCM)
      }
      messages = [
        { role: 'system', content: system },
        { role: 'user', content: messagesOrPrompt },
      ]
    } else {
      messages = messagesOrPrompt
    }

    const attempt = async (): Promise<string> => {
      const response = await client.chat.completions.create({
        model: DEFAULT_MODEL,
        messages,
        temperature: 0.2,
      })
      const content = response.choices[0]?.message?.content
      if (!content) throw new Error('[LLMClient] Empty response from LLM')
      return content
    }

    try {
      return await attempt()
    } catch (err) {
      const status = (err as { status?: number }).status
      if (status === 429) {
        await new Promise((r) => setTimeout(r, 2000))
        return attempt()
      }
      throw err
    }
  },

  /**
   * Stream a completion — yields token chunks as they arrive.
   * Used by UC-007 code generation for real-time response broadcast via WS.
   */
  async *stream(userPrompt: string, systemPromptOrDCM?: string | DCM): AsyncGenerator<string> {
    let system: string
    if (typeof systemPromptOrDCM === 'string') {
      system = systemPromptOrDCM
    } else if (typeof systemPromptOrDCM === 'object') {
      system = buildAdvlSystemPrompt(systemPromptOrDCM)
    } else {
      system = buildAdvlSystemPrompt()
    }

    const stream = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) yield delta
    }
  },
}
