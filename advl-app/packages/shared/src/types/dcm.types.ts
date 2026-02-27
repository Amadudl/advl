/**
 * dcm.types.ts — Data Communication Matrix type definitions
 *
 * These types represent the in-memory structure of DCM.yaml.
 * They are the canonical types for all DCM operations across the ADVL system.
 * Source of truth for structure: /schema/DCM_SCHEMA.md
 */

export type UseCaseStatus = 'planned' | 'in_progress' | 'implemented' | 'deprecated'

export type ADRStatus = 'proposed' | 'accepted' | 'superseded' | 'deprecated'

export type AppliedRule =
  | 'NO_DUPLICATE'
  | 'USE_CASE_FIRST'
  | 'META_INJECTION'
  | 'STACK_RULES'
  | 'CORE_RULES'
  | 'NO_FAKE'

export interface DCMFunction {
  name: string
  file: string
  line: number
  endpoint: string | null
  db_tables: string[]
  auth_required: boolean
  roles_required: string[]
  last_modified: string // ISO date YYYY-MM-DD
}

export interface UseCase {
  id: string                        // UC-001, UC-002, ...
  title: string                     // "[Actor] [action]"
  /** Alias for title — used by Layer 2 canvas and DCMDocument format */
  name?: string
  value: string                     // Business value statement
  status: UseCaseStatus
  visual_element_id: string | null | 'pending'
  actor: string
  preconditions: string[]
  postconditions: string[]
  functions: DCMFunction[]
  rules_applied: AppliedRule[]
  deprecated_date: string | null    // ISO date
  deprecated_reason: string | null
  replaced_by: string | null        // UC-ID of replacement
}

export interface ADRAlternative {
  name: string
  reason_rejected: string
}

export interface ADR {
  id: string                        // ADR-001, ADR-002, ...
  date: string                      // ISO date
  status: ADRStatus
  title: string
  context: string
  decision: string
  alternatives_considered: ADRAlternative[]
  consequences: string[]
  stack_update: string | null
}

export interface DCMStack {
  runtime: string | null
  framework: string | null
  language: string | null
  orm: string | null
  database: string | null
  auth: string | null
  api_style: string | null
  styling: string | null
  ui_components: string | null
  state_management: string | null
  email: string | null
  file_storage: string | null
  deployment: string | null
  ci_cd: string | null
  testing: string | null
  package_manager: string | null
  monorepo: boolean | null
}

export interface DCMSnapshot {
  version: string
  date: string
  milestone: string
  file: string
}

export interface DCM {
  version: string
  project: string
  description: string
  author: string
  created: string
  last_updated: string
  stack: DCMStack
  adrs: ADR[]
  use_cases: UseCase[]
  deprecated: UseCase[]
  snapshots: DCMSnapshot[]
}

// ── Layer 2 Canvas types ─────────────────────────────────────────────────────

/** DCM-level screen/component definition (separate from canvas VisualElement layout) */
export type ScreenElementType = 'screen' | 'component' | 'modal' | 'overlay'

export interface ScreenElement {
  id: string
  type: ScreenElementType
  name: string
  route?: string
  children?: string[]
  meta?: Record<string, unknown>
}

// ── Data Flow types (Layer 1) ─────────────────────────────────────────────────

export interface TableField {
  name: string
  type: string
  is_pii?: boolean
  gdpr_category?: string
}

export interface DbTable {
  id: string
  name: string
  owner_service?: string
  fields?: TableField[]
  audit_log?: boolean
  retention_days?: number | null
  soft_delete?: boolean
  readers?: string[]
  writers?: string[]
  deleters?: string[]
  source_file?: string
}

export interface Endpoint {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS'
  path: string
  source_file?: string
  use_cases?: string[]
}

export interface FunctionEntry {
  id: string
  name: string
  source_file?: string
  use_cases?: string[]
}

export interface DataFlow {
  id: string
  name: string
  source: string
  target: string
  operation: 'read' | 'write' | 'delete' | 'stream'
  transforms?: string[]
  use_case_id?: string
  critical?: boolean
}

/**
 * DCMDocument — the in-memory format used by the canvas and dev seed.
 * Extends the core DCM structure with visual_elements for screen-level mapping.
 * Produced by dcmService.readDCM() when visual_elements are present in YAML,
 * or seeded directly in dev mode.
 */
export interface DCMDocument {
  version: string
  project?: string
  description?: string
  use_cases: UseCase[]
  visual_elements: ScreenElement[]
  stack?: Partial<DCMStack>
  adrs?: ADR[]
  deprecated?: UseCase[]
  snapshots?: DCMSnapshot[]
  db_tables?: DbTable[]
  data_flows?: DataFlow[]
  endpoints?: Endpoint[]
  functions?: FunctionEntry[]
}
