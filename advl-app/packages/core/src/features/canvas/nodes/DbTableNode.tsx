/**
 * nodes/DbTableNode.tsx — React Flow custom node for a DCM Database Table entry
 *
 * Used by both DCMArchCanvas (Layer 1 architecture view) and DataFlowCanvas
 * (Layer 1 data flow view). The data shape is the richer violation-aware one;
 * legacy referencedBy fields are simply not rendered when absent.
 *
 * advl_meta: UC-002 / VE-Canvas-Flow
 */
import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { ViolationSeverity } from '../utils/violation-detector'

export interface DbTableNodeData extends Record<string, unknown> {
  tableId?: string
  tableName?: string
  name?: string
  ownerService?: string
  fieldCount?: number
  hasPii?: boolean
  auditLog?: boolean
  retentionDays?: number | null
  violations?: number
  worstSeverity?: ViolationSeverity | null
  referencedBy?: string[]
}

const SEVERITY_BORDER: Record<string, string> = {
  critical: 'border-red-500 shadow-red-900/50',
  warning: 'border-yellow-500 shadow-yellow-900/30',
  info: 'border-blue-500',
  none: 'border-gray-700',
}

const SEVERITY_BG: Record<string, string> = {
  critical: 'bg-red-950/30',
  warning: 'bg-yellow-950/20',
  info: 'bg-blue-950/20',
  none: 'bg-gray-900',
}

export const DbTableNode = memo(({ data: rawData, selected }: NodeProps) => {
  const data = rawData as DbTableNodeData
  const sev = data.worstSeverity ?? 'none'
  const displayName = data.name ?? data.tableName ?? data.tableId ?? '?'
  const border = SEVERITY_BORDER[sev] ?? SEVERITY_BORDER['none']
  const bg = SEVERITY_BG[sev] ?? SEVERITY_BG['none']

  return (
    <div
      className={[
        'min-w-[200px] rounded-lg border-2 p-3 shadow-lg',
        'transition-all duration-150',
        border, bg,
        selected ? 'ring-2 ring-white/30' : '',
      ].join(' ')}
    >
      <Handle type="target" position={Position.Left}
        className="!bg-emerald-400 !border-gray-900 !w-3 !h-3" />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base">🗄</span>
          <span className="font-bold text-sm text-white">{displayName}</span>
        </div>
        {(data.violations ?? 0) > 0 && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
            data.worstSeverity === 'critical' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'
          }`}>
            {data.violations}
          </span>
        )}
      </div>

      <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
        <span>👤</span>
        <span className={data.ownerService ? 'text-gray-300' : 'text-red-400 font-semibold'}>
          {data.ownerService ?? 'KEIN OWNER!'}
        </span>
      </div>

      <div className="flex flex-wrap gap-1 mt-2">
        {data.hasPii && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-900 text-orange-300 font-mono">PII</span>
        )}
        {data.auditLog !== undefined && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
            data.auditLog ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
          }`}>
            {data.auditLog ? '✓ AUDIT' : '✗ AUDIT'}
          </span>
        )}
        {data.retentionDays != null ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">
            {data.retentionDays}d
          </span>
        ) : data.retentionDays === null ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-900 text-yellow-300 font-mono">
            ∞ kein Limit
          </span>
        ) : null}
        {(data.fieldCount ?? 0) > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 font-mono">
            {data.fieldCount} cols
          </span>
        )}
        {data.referencedBy && data.referencedBy.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 font-mono">
            {data.referencedBy.length} fn{data.referencedBy.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Right}
        className="!bg-blue-400 !border-gray-900 !w-3 !h-3" />
    </div>
  )
})

DbTableNode.displayName = 'DbTableNode'
