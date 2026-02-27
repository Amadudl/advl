/**
 * utils/dcm-to-flow.ts — Transform DCMDocument into a full React Flow graph
 *
 * Builds three node layers from real DCM data (no hardcoded arrays):
 *   Layer A — Use Case nodes  (one per use_cases[] entry)
 *   Layer B — Function nodes  (one per unique function across all UCs)
 *   Layer C — DB Table nodes  (one per unique db_table referenced by functions)
 *
 * Edges:
 *   UC → Function    (UC owns the function)
 *   Function → Table (function reads/writes the table)
 *
 * Also exports buildScreenFlowGraph for the screen/navigation view (Layer 2).
 *
 * UC-002 — VE-Canvas-Flow
 */
import type { Node, Edge } from '@xyflow/react'
import type { DCMDocument, UseCase, DCMFunction, ScreenElement } from '@advl/shared'
import type { NavigationEdge } from '../../../store/dcm.store'
import type { UseCaseNodeData } from '../nodes/UseCaseNode'
import type { FunctionNodeData } from '../nodes/FunctionNode'
import type { DbTableNodeData } from '../nodes/DbTableNode'

// ── Screen node (retained for Layer 2 user-flow view) ────────────────────────

export interface ScreenNodeData extends Record<string, unknown> {
  screenId: string
  name: string
  route: string | undefined
  useCaseCount: number
  status: 'implemented' | 'planned' | 'mixed'
}

const SCREEN_COLS = 4
const SCREEN_COL_W = 280
const SCREEN_ROW_H = 180

export function buildScreenFlowGraph(
  screens: ScreenElement[],
  navEdges: NavigationEdge[],
  useCasesByScreen: Record<string, number>,
): { nodes: Node<ScreenNodeData>[]; edges: Edge[] } {
  const nodes: Node<ScreenNodeData>[] = screens.map((screen, index) => ({
    id: screen.id,
    type: 'screenNode',
    position: {
      x: (index % SCREEN_COLS) * SCREEN_COL_W + 40,
      y: Math.floor(index / SCREEN_COLS) * SCREEN_ROW_H + 40,
    },
    data: {
      screenId: screen.id,
      name: screen.name,
      route: screen.route,
      useCaseCount: useCasesByScreen[screen.id] ?? 0,
      status: 'implemented',
    },
  }))

  const edges: Edge[] = navEdges.map((e) => ({
    id: e.id,
    source: e.sourceScreenId,
    target: e.targetScreenId,
    label: e.label,
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#6366f1', strokeWidth: 2 },
    labelStyle: { fontSize: 11, fill: '#a5b4fc' },
    labelBgStyle: { fill: '#1e1b4b', fillOpacity: 0.85 },
  }))

  return { nodes, edges }
}

// ── DCM architecture graph (UC + Function + DbTable) ─────────────────────────

const UC_COL_W = 280
const UC_ROW_H = 160
const UC_COLS = 4

const FN_START_Y = 320
const FN_COL_W = 240
const FN_ROW_H = 140
const FN_COLS = 5

const DB_START_Y = 540
const DB_COL_W = 200
const DB_ROW_H = 100
const DB_COLS = 6

type AnyNodeData = UseCaseNodeData | FunctionNodeData | DbTableNodeData

export function buildDCMGraph(doc: DCMDocument): { nodes: Node<AnyNodeData>[]; edges: Edge[] } {
  const nodes: Node<AnyNodeData>[] = []
  const edges: Edge[] = []

  // ── Collect all unique functions keyed by "file:line" ──────────────────────
  const fnMap = new Map<string, { fn: DCMFunction; ucId: string }>()
  for (const uc of doc.use_cases) {
    for (const fn of uc.functions ?? []) {
      const key = `${fn.file}:${fn.line}`
      if (!fnMap.has(key)) fnMap.set(key, { fn, ucId: uc.id })
    }
  }

  // ── Collect all unique db_tables referenced by any function ───────────────
  const tableMap = new Map<string, string[]>() // tableName → fn keys that reference it
  for (const [key, { fn }] of fnMap) {
    for (const table of fn.db_tables ?? []) {
      if (!tableMap.has(table)) tableMap.set(table, [])
      tableMap.get(table)!.push(key)
    }
  }

  // ── UC nodes ──────────────────────────────────────────────────────────────
  doc.use_cases.forEach((uc: UseCase, i: number) => {
    nodes.push({
      id: uc.id,
      type: 'useCaseNode',
      position: {
        x: (i % UC_COLS) * UC_COL_W + 40,
        y: Math.floor(i / UC_COLS) * UC_ROW_H + 40,
      },
      data: {
        ucId: uc.id,
        title: uc.name ?? uc.title,
        actor: uc.actor,
        status: uc.status,
        functionCount: (uc.functions ?? []).length,
      } satisfies UseCaseNodeData,
    })
  })

  // ── Function nodes + UC→Fn edges ──────────────────────────────────────────
  let fnIndex = 0
  for (const [key, { fn, ucId }] of fnMap) {
    const nodeId = `fn_${key}`
    nodes.push({
      id: nodeId,
      type: 'functionNode',
      position: {
        x: (fnIndex % FN_COLS) * FN_COL_W + 40,
        y: Math.floor(fnIndex / FN_COLS) * FN_ROW_H + FN_START_Y,
      },
      data: {
        name: fn.name,
        file: fn.file,
        line: fn.line,
        endpoint: fn.endpoint,
        authRequired: fn.auth_required,
        dbTables: fn.db_tables ?? [],
      } satisfies FunctionNodeData,
    })

    edges.push({
      id: `edge_${ucId}_${nodeId}`,
      source: ucId,
      target: nodeId,
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#818cf8', strokeWidth: 1.5 },
      markerEnd: { type: 'arrow' as const },
    })

    fnIndex++
  }

  // ── DbTable nodes + Fn→Table edges ────────────────────────────────────────
  let tableIndex = 0
  for (const [tableName, fnKeys] of tableMap) {
    const tableNodeId = `table_${tableName}`
    nodes.push({
      id: tableNodeId,
      type: 'dbTableNode',
      position: {
        x: (tableIndex % DB_COLS) * DB_COL_W + 40,
        y: Math.floor(tableIndex / DB_COLS) * DB_ROW_H + DB_START_Y,
      },
      data: {
        tableName,
        referencedBy: fnKeys,
      } satisfies DbTableNodeData,
    })

    for (const key of fnKeys) {
      edges.push({
        id: `edge_fn_${key}_${tableNodeId}`,
        source: `fn_${key}`,
        target: tableNodeId,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#34d399', strokeWidth: 1.5 },
        markerEnd: { type: 'arrow' as const },
      })
    }

    tableIndex++
  }

  return { nodes, edges }
}
