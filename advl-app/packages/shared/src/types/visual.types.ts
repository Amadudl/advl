/**
 * visual.types.ts — Visual element and ADVL metadata types
 *
 * Defines the shape of visual elements on the ADVL canvas and the
 * advl_meta block that links every element to its DCM entry.
 * See /rules/META_INJECTION.md for the full injection specification.
 */

export interface AdvlMeta {
  use_case_id: string
  use_case_title: string
  function: string | null
  file: string | null
  line: number | null
  endpoint: string | null
  db_tables: string[]
  auth_required: boolean | null
  roles_required: string[]
  last_verified: string | null        // ISO date YYYY-MM-DD
  dcm_version: string
  visual_element_id: string
  status?: 'pending' | 'verified'
}

export interface AdvlMetaConnection {
  trigger: string                     // 'on_mount' | 'on_submit' | 'on_click' | etc.
  use_case_id: string
  use_case_title: string
  function: string
  file: string
  line: number
  endpoint: string | null
  db_tables: string[]
  auth_required: boolean
  last_verified: string
}

export interface AdvlMetaMulti {
  visual_element_id: string
  connections: AdvlMetaConnection[]
  dcm_version: string
}

export type VisualElementType =
  | 'form'
  | 'button'
  | 'modal'
  | 'page'
  | 'card'
  | 'table'
  | 'list'
  | 'input'
  | 'select'
  | 'navigation'
  | 'container'
  | 'text'
  | 'image'

export interface VisualElement {
  /** Unique ID following VE-[Entity]-[Action] convention */
  id: string
  type: VisualElementType
  label: string
  /** Position on the canvas */
  x: number
  y: number
  width: number
  height: number
  /** ADVL metadata — null only for pure layout elements */
  advl_meta: AdvlMeta | AdvlMetaMulti | null
  /** Child element IDs */
  children: string[]
  /** Custom properties specific to the element type */
  props: Record<string, unknown>
}

export interface CanvasState {
  elements: Record<string, VisualElement>
  selectedIds: string[]
  zoom: number
  panX: number
  panY: number
}
