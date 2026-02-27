/**
 * agent.constants.ts — WebSocket event names and agent message type constants
 *
 * Centralizes all string literals used in the agent communication protocol.
 * Import from here — never hardcode these strings in application code.
 */

export const AGENT_WS_PATH = '/ws'

export const AGENT_EVENTS = {
  CONNECTION: 'connection',
  MESSAGE: 'message',
  CLOSE: 'close',
  ERROR: 'error',
} as const

export const AGENT_MESSAGE_TYPES = {
  USE_CASE_SUBMIT: 'USE_CASE_SUBMIT',
  DCM_QUERY: 'DCM_QUERY',
  DCM_UPDATE: 'DCM_UPDATE',
  META_INJECT: 'META_INJECT',
  CODE_GENERATE: 'CODE_GENERATE',
  RULE_VALIDATE: 'RULE_VALIDATE',
  AGENT_STATUS: 'AGENT_STATUS',
  AGENT_RESPONSE: 'AGENT_RESPONSE',
  AGENT_ERROR: 'AGENT_ERROR',
} as const

export const AGENT_STATUS = {
  IDLE: 'idle',
  THINKING: 'thinking',
  WRITING: 'writing',
  ERROR: 'error',
} as const

/** How long Core waits for an agent response before timing out (ms) */
export const AGENT_RESPONSE_TIMEOUT_MS = 60_000

/** Interval for agent heartbeat status broadcasts (ms) */
export const AGENT_HEARTBEAT_INTERVAL_MS = 5_000
