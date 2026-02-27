/**
 * use-case.types.ts — Use case input/output types for agent and UI communication
 *
 * These types represent the data shapes used when creating, updating, and
 * querying use cases through the UI and agent protocol. Distinct from the
 * full DCM types which represent the stored/persisted structure.
 */

export interface UseCaseInput {
  /** Plain-language description provided by the user */
  description: string
  /** Optional actor override — agent infers if not provided */
  actor?: string
  /** Optional business value — agent requests if not provided */
  value?: string
}

export interface UseCaseQueryResult {
  /** Whether an existing use case was found that matches the intent */
  found: boolean
  /** The matching use case ID if found */
  matchedId?: string
  /** Confidence score 0–1 */
  confidence?: number
  /** Reason for the match or non-match */
  reason: string
}

export interface FunctionQueryResult {
  /** Whether an existing function was found that satisfies the need */
  found: boolean
  /** The matching function name if found */
  functionName?: string
  /** The use case this function belongs to */
  useCaseId?: string
  /** File path of the function */
  file?: string
  /** Line number of the function */
  line?: number
  /** The endpoint if this function has one */
  endpoint?: string
  /** Human-readable reason for the result (used when found=false) */
  reason?: string
}

export interface EndpointDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  description: string
  auth_required: boolean
  input_schema?: Record<string, unknown>
  output_schema?: Record<string, unknown>
}
