/**
 * utils/dcm-to-flow.ts — Transform DCMDocument into React Flow nodes and edges
 *
 * Converts ScreenElement[] and NavigationEdge[] from the DCM store into
 * the Node<ScreenNodeData>[] and Edge[] formats that React Flow consumes.
 * Layout: auto-grid with configurable column count.
 */
import type { Node, Edge } from '@xyflow/react'
import type { ScreenElement } from '@advl/shared'
import type { NavigationEdge } from '../../../store/dcm.store'

export interface ScreenNodeData extends Record<string, unknown> {
  screenId: string
  name: string
  route: string | undefined
  useCaseCount: number
  status: 'implemented' | 'planned' | 'mixed'
}

const COLS = 4
const COL_WIDTH = 280
const ROW_HEIGHT = 180

export function buildFlowGraph(
  screens: ScreenElement[],
  navEdges: NavigationEdge[],
  useCasesByScreen: Record<string, number>,
): { nodes: Node<ScreenNodeData>[]; edges: Edge[] } {
  const nodes: Node<ScreenNodeData>[] = screens.map((screen, index) => {
    const col = index % COLS
    const row = Math.floor(index / COLS)

    return {
      id: screen.id,
      type: 'screenNode',
      position: {
        x: col * COL_WIDTH + 40,
        y: row * ROW_HEIGHT + 40,
      },
      data: {
        screenId: screen.id,
        name: screen.name,
        route: screen.route,
        useCaseCount: useCasesByScreen[screen.id] ?? 0,
        status: 'implemented',
      },
    }
  })

  const edges: Edge[] = navEdges.map((navEdge) => ({
    id: navEdge.id,
    source: navEdge.sourceScreenId,
    target: navEdge.targetScreenId,
    label: navEdge.label,
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#6366f1', strokeWidth: 2 },
    labelStyle: { fontSize: 11, fill: '#a5b4fc' },
    labelBgStyle: { fill: '#1e1b4b', fillOpacity: 0.85 },
  }))

  return { nodes, edges }
}
