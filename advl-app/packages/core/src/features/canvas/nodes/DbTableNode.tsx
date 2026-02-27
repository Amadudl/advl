/**
 * nodes/DbTableNode.tsx — React Flow custom node for a DCM Database Table entry
 *
 * advl_meta: UC-002 / VE-Canvas-Flow
 */
import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'

export interface DbTableNodeData extends Record<string, unknown> {
  tableName: string
  referencedBy: string[]
}

export const DbTableNode = memo(({ data: rawData, selected }: NodeProps) => {
  const data = rawData as DbTableNodeData

  return (
    <div
      className={[
        'min-w-[140px] max-w-[180px] rounded-lg border-2 p-2.5',
        'bg-gray-900 text-white shadow-md',
        'transition-all duration-150',
        'border-emerald-500/40',
        selected ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-gray-900' : '',
      ].join(' ')}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-emerald-400 !border-gray-900 !w-3 !h-3"
      />

      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm">🗄️</span>
        <span className="font-mono font-semibold text-xs text-emerald-300 truncate" title={data.tableName}>
          {data.tableName}
        </span>
      </div>

      {data.referencedBy.length > 0 && (
        <div className="text-[10px] text-gray-500 mt-1">
          used by {data.referencedBy.length} fn{data.referencedBy.length !== 1 ? 's' : ''}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-emerald-400 !border-gray-900 !w-3 !h-3"
      />
    </div>
  )
})

DbTableNode.displayName = 'DbTableNode'
