/**
 * DataFlowCanvas.tsx — Layer 1: Data Flow View
 *
 * Renders DCM db_tables as nodes with owner/PII/audit/retention badges.
 * Renders data_flows as typed edges (read/write/delete/stream).
 * Violations are detected client-side and colour nodes red (critical)
 * or yellow (warning). The MiniMap mirrors the severity colours.
 *
 * UC-010 / VE-Canvas-DataFlow
 */
import { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import type { Node, Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useDCMStore } from '../../store/dcm.store'
import {
  detectViolations,
  getViolationsForEntity,
  getWorstSeverity,
} from './utils/violation-detector'
import { DbTableNode } from './nodes/DbTableNode'
import type { DbTableNodeData } from './nodes/DbTableNode'

const NODE_TYPES = { dbTableNode: DbTableNode }

const OPERATION_COLORS: Record<string, string> = {
  read: '#3b82f6',
  write: '#10b981',
  delete: '#ef4444',
  stream: '#8b5cf6',
}

function buildDataFlowGraph(
  dcm: import('@advl/shared').DCMDocument,
): { nodes: Node<DbTableNodeData>[]; edges: Edge[] } {
  const violations = detectViolations(dcm)

  const nodes: Node<DbTableNodeData>[] = (dcm.db_tables ?? []).map((table, i) => {
    const tableViolations = getViolationsForEntity(violations, table.id)
    const worstSeverity = getWorstSeverity(tableViolations)
    const col = i % 3
    const row = Math.floor(i / 3)

    return {
      id: table.id,
      type: 'dbTableNode',
      position: { x: col * 320 + 40, y: row * 220 + 60 },
      data: {
        tableId: table.id,
        name: table.name,
        ownerService: table.owner_service,
        fieldCount: table.fields?.length ?? 0,
        hasPii: table.fields?.some((f) => f.is_pii) ?? false,
        auditLog: table.audit_log ?? false,
        retentionDays: table.retention_days ?? null,
        violations: tableViolations.length,
        worstSeverity,
      },
    }
  })

  const edges: Edge[] = (dcm.data_flows ?? []).map((flow) => ({
    id: flow.id,
    source: flow.source,
    target: flow.target,
    label: flow.transforms?.length
      ? `${flow.operation} → ${flow.transforms.join(', ')}`
      : flow.operation,
    type: 'smoothstep',
    animated: flow.operation === 'stream',
    style: {
      stroke: OPERATION_COLORS[flow.operation] ?? '#6b7280',
      strokeWidth: flow.critical ? 3 : 2,
      strokeDasharray: flow.operation === 'read' ? '4 2' : undefined,
    },
    labelStyle: { fontSize: 10, fill: OPERATION_COLORS[flow.operation] ?? '#6b7280' },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.9 },
  }))

  return { nodes, edges }
}

function miniMapNodeColor(node: Node): string {
  const d = node.data as DbTableNodeData
  if (d.worstSeverity === 'critical') return '#ef4444'
  if (d.worstSeverity === 'warning') return '#f59e0b'
  return '#374151'
}

export function DataFlowCanvas() {
  const { document: dcm } = useDCMStore()

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!dcm) return { initialNodes: [], initialEdges: [] }
    const { nodes, edges } = buildDataFlowGraph(dcm)
    return { initialNodes: nodes, initialEdges: edges }
  }, [dcm])

  const [flowNodes, , onNodesChange] = useNodesState(initialNodes)
  const [flowEdges, , onEdgesChange] = useEdgesState(initialEdges)

  const criticalCount = flowNodes.filter(
    (n) => (n.data as DbTableNodeData).worstSeverity === 'critical',
  ).length

  if (!dcm || flowNodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600">
        <div className="text-4xl">🔗</div>
        <div className="text-sm font-medium">Keine DB-Tabellen im DCM</div>
        <div className="text-xs text-gray-700 text-center max-w-xs">
          Füge <code className="text-indigo-400">db_tables</code> und{' '}
          <code className="text-indigo-400">data_flows</code> in dein DCM.yaml ein
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-gray-950">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1f2937" />
        <Controls className="!bg-gray-800 !border-gray-700 !shadow-xl" />
        <MiniMap
          className="!bg-gray-900 !border-gray-700"
          nodeColor={miniMapNodeColor}
          maskColor="rgba(0,0,0,0.7)"
        />

        {/* Status bar */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-3
                        bg-gray-900/90 border border-gray-700 rounded-lg
                        px-3 py-1.5 backdrop-blur-sm">
          <span className="text-emerald-400 text-xs font-bold tracking-wider">LAYER 1</span>
          <span className="text-gray-500 text-xs">DATA FLOW</span>
          <span className="text-gray-600 text-xs">
            {flowNodes.length} tables · {flowEdges.length} flows
          </span>
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 bg-red-900/60 border border-red-500/40
                             rounded px-2 py-0.5 text-red-300 text-xs font-semibold">
              🔴 {criticalCount} kritisch
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="absolute bottom-16 right-3 z-10 bg-gray-900/90 border border-gray-700
                        rounded-lg p-2 backdrop-blur-sm">
          <div className="text-[10px] text-gray-500 mb-1.5 font-semibold tracking-wider">FLOWS</div>
          {Object.entries(OPERATION_COLORS).map(([op, color]) => (
            <div key={op} className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-1">
              <div className="w-4 h-0.5 rounded" style={{ backgroundColor: color }} />
              <span>{op}</span>
            </div>
          ))}
        </div>
      </ReactFlow>
    </div>
  )
}
