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
 * TODO: Implement complete() with ADVL system prompt injection
 * TODO: Implement streaming support for real-time agent response display
 * TODO: Implement retry logic with exponential backoff
 */
import OpenAI from 'openai'

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

export const llmClient = {
  /**
   * Send a completion request to the configured LLM.
   * Injects the ADVL agent system prompt automatically.
   * TODO: Add rulesEngine.getRuleSummaryForPrompt() to system prompt
   * TODO: Add DCM state summary to system prompt context
   */
  async complete(userPrompt: string, systemPrompt?: string): Promise<string> {
    const system = systemPrompt ?? `You are the ADVL Agent — a disciplined engineering collaborator.
You operate inside ADVL (AI Development Visual Language), a structured software engineering system.
You must always follow ADVL rules: DCM-first, use-case-driven, no duplication, no fake implementations.
Before writing any function, you check the DCM for existing implementations.
You always think in use cases and business value, never in raw technical tasks.
Every output you produce must be traceable, consistent, and compliant with the ADVL rulebook.`

    const response = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2, // Low temperature for consistent, rule-following output
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('[LLMClient] Empty response from LLM')
    return content
  },

  /**
   * Stream a completion — yields chunks as they arrive.
   * TODO: Implement streaming and wire to agent WebSocket broadcast
   */
  async *stream(userPrompt: string, systemPrompt?: string): AsyncGenerator<string> {
    const system = systemPrompt ?? 'You are the ADVL Agent.'
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
