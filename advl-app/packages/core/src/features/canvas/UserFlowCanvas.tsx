/**
 * UserFlowCanvas.tsx — Layer 2: User Flow View
 *
 * Renders DCM screens as React Flow nodes and navigation edges from
 * postconditions with 'screen_id:' prefix. Data comes from dcm.store.
 * NODE_TYPES must be defined outside the component (React Flow requirement).
 */
import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
} from '@xyflow/react'
import type { Connection } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useDCMStore } from '../../store/dcm.store'
import { buildScreenFlowGraph, buildDCMGraph } from './utils/dcm-to-flow'
import { ScreenNode } from './nodes/ScreenNode'
import { UseCaseNode } from './nodes/UseCaseNode'
import { FunctionNode } from './nodes/FunctionNode'
import { DbTableNode } from './nodes/DbTableNode'

const SCREEN_NODE_TYPES = {
  screenNode: ScreenNode,
}

const DCM_NODE_TYPES = {
  useCaseNode: UseCaseNode,
  functionNode: FunctionNode,
  dbTableNode: DbTableNode,
}

export function UserFlowCanvas() {
  const { document: dcm, getScreens, getNavigationEdges, getUseCasesForScreen } = useDCMStore()

  const { initialNodes, initialEdges } = useMemo(() => {
    const screens = getScreens()
    const navEdges = getNavigationEdges()

    const useCasesByScreen: Record<string, number> = {}
    for (const screen of screens) {
      useCasesByScreen[screen.id] = getUseCasesForScreen(screen.id).length
    }

    const { nodes, edges } = buildScreenFlowGraph(screens, navEdges, useCasesByScreen)
    return { initialNodes: nodes, initialEdges: edges }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dcm])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  )

  if (!dcm) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
        <div className="text-5xl">📐</div>
        <div className="text-lg font-medium">Kein Projekt geladen</div>
        <div className="text-sm">Öffne ein ADVL Projekt um den User Flow zu sehen</div>
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
        <div className="text-5xl">🗺️</div>
        <div className="text-lg font-medium">Noch keine Screens im DCM</div>
        <div className="text-sm text-center max-w-xs">
          Füge <code className="text-indigo-400">visual_elements</code> vom Typ{' '}
          <code className="text-indigo-400">screen</code> in dein DCM.yaml ein
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-gray-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={SCREEN_NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: '#6366f1', strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#374151" />
        <Controls className="!bg-gray-800 !border-gray-700 !shadow-xl" />
        <MiniMap
          className="!bg-gray-900 !border-gray-700"
          nodeColor="#6366f1"
          maskColor="rgba(0,0,0,0.6)"
        />
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2
                        bg-gray-900/90 border border-indigo-500/30 rounded-lg
                        px-3 py-1.5 backdrop-blur-sm">
          <span className="text-indigo-400 text-xs font-bold tracking-wider">LAYER 2</span>
          <span className="text-gray-500 text-xs">USER FLOW</span>
          <span className="text-gray-600 text-xs ml-2">
            {nodes.length} screens · {edges.length} transitions
          </span>
        </div>
      </ReactFlow>
    </div>
  )
}

/**
 * DCMArchCanvas — UC-002: renders Use Case, Function, and DB Table nodes
 * from real dcm.store document data. No hardcoded arrays.
 *
 * advl_meta: { use_case_id: "UC-002", visual_element_id: "VE-Canvas-Flow" }
 */
export function DCMArchCanvas() {
  const { document: dcm } = useDCMStore()

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!dcm) return { initialNodes: [], initialEdges: [] }
    const { nodes, edges } = buildDCMGraph(dcm)
    return { initialNodes: nodes, initialEdges: edges }
  }, [dcm])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  )

  if (!dcm) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
        <div className="text-5xl">🔗</div>
        <div className="text-lg font-medium">Kein Projekt geladen</div>
        <div className="text-sm">Öffne ein ADVL Projekt um den Architektur-Graphen zu sehen</div>
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
        <div className="text-5xl">🔗</div>
        <div className="text-lg font-medium">DCM enthält noch keine Use Cases</div>
        <div className="text-sm text-center max-w-xs">
          Registriere Use Cases im DCM.yaml um den Architektur-Graphen zu sehen
        </div>
      </div>
    )
  }

  const ucCount = dcm.use_cases.length
  const fnCount = nodes.filter((n) => n.type === 'functionNode').length
  const tableCount = nodes.filter((n) => n.type === 'dbTableNode').length

  return (
    <div className="w-full h-full bg-gray-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={DCM_NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#374151" />
        <Controls className="!bg-gray-800 !border-gray-700 !shadow-xl" />
        <MiniMap
          className="!bg-gray-900 !border-gray-700"
          nodeColor={(node) =>
            node.type === 'useCaseNode' ? '#818cf8'
            : node.type === 'functionNode' ? '#a78bfa'
            : '#34d399'
          }
          maskColor="rgba(0,0,0,0.6)"
        />
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2
                        bg-gray-900/90 border border-indigo-500/30 rounded-lg
                        px-3 py-1.5 backdrop-blur-sm">
          <span className="text-indigo-400 text-xs font-bold tracking-wider">LAYER 1</span>
          <span className="text-gray-500 text-xs">DCM GRAPH</span>
          <span className="text-gray-600 text-xs ml-2">
            {ucCount} UCs · {fnCount} fns · {tableCount} tables
          </span>
        </div>
      </ReactFlow>
    </div>
  )
}
