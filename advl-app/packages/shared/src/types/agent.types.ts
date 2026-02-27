/**
 * agent.types.ts — Agent message protocol types
 *
 * Defines the WebSocket message protocol between the Core UI and the Agent process.
 * All communication between Core and Agent uses this typed message format.
 * See ARCHITECTURE.md for the full communication flow description.
 */

export type AgentMessageType =
  | 'USE_CASE_SUBMIT'     // User submitted a new use case description
  | 'AGENT_QUERY'         // Free-form natural language query routed through LLM (UC-003)
  | 'DCM_QUERY'           // Query existing functions/endpoints in the DCM
  | 'DCM_UPDATE'          // Agent updates the DCM with new/modified entries
  | 'META_INJECT'         // Inject advl_meta into a visual element
  | 'CODE_GENERATE'       // Generate code for a use case
  | 'RULE_VALIDATE'       // Validate output against rulebooks
  | 'AGENT_STATUS'        // Agent heartbeat / status broadcast
  | 'AGENT_RESPONSE'      // Agent response to any inbound message
  | 'AGENT_ERROR'         // Agent encountered an error

export type AgentStatus = 'idle' | 'thinking' | 'writing' | 'error'

export interface AgentMessage {
  /** UUID — used to match responses to requests */
  id: string
  type: AgentMessageType
  payload: unknown
  /** ISO timestamp */
  timestamp: string
  /** ID of the message this is responding to (for AGENT_RESPONSE) */
  replyTo?: string
}

export interface AgentStatusPayload {
  status: AgentStatus
  message?: string
  progress?: number  // 0–100
}

export interface UseCaseSubmitPayload {
  description: string
  actor?: string
  value?: string
}

export interface DCMQueryPayload {
  intent: string
  entityType?: string
  httpMethod?: string
  resourcePath?: string
}

export interface DCMUpdatePayload {
  type: 'use_case_created' | 'use_case_updated' | 'function_registered' | 'use_case_deprecated'
  data: unknown
}

export interface MetaInjectPayload {
  elementId: string
  meta: Record<string, unknown>
}

export interface CodeGeneratePayload {
  useCaseId: string
  targetFile?: string
}

export interface RuleValidatePayload {
  subject: 'function' | 'use_case' | 'visual_element' | 'dcm'
  data: unknown
}

export interface AgentResponsePayload {
  success: boolean
  data?: unknown
  message?: string
  violations?: RuleViolation[]
}

export interface AgentErrorPayload {
  code: string
  message: string
  details?: unknown
}

export interface RuleViolation {
  rule: string
  severity: 'error' | 'warning'
  message: string
  location?: string
}
