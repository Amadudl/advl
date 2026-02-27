/**
 * nodes/UseCaseNode.tsx — React Flow custom node for a DCM Use Case
 *
 * advl_meta: UC-002 / VE-Canvas-Flow
 */
import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'

export interface UseCaseNodeData extends Record<string, unknown> {
  ucId: string
  title: string
  actor: string
  status: string
  functionCount: number
}

const STATUS_PILL: Record<string, string> = {
  implemented: 'bg-green-900 text-green-300',
  in_progress: 'bg-yellow-900 text-yellow-300',
  planned: 'bg-gray-800 text-gray-400',
  deprecated: 'bg-red-950 text-red-500',
}

export const UseCaseNode = memo(({ data: rawData, selected }: NodeProps) => {
  const data = rawData as UseCaseNodeData
  const pill = STATUS_PILL[data.status] ?? STATUS_PILL['planned']

  return (
    <div
      className={[
        'min-w-[200px] max-w-[240px] rounded-lg border-2 p-3',
        'bg-gray-900 text-white shadow-lg',
        'transition-all duration-150',
        'border-indigo-500/50',
        selected ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-gray-900' : '',
      ].join(' ')}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-indigo-400 !border-gray-900 !w-3 !h-3"
      />

      <div className="flex items-start gap-2 mb-1.5">
        <span className="text-base mt-0.5">📋</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-xs leading-snug truncate" title={data.title}>
            {data.title}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">actor: {data.actor}</div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-1.5">
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${pill}`}>
          {data.status}
        </span>
        {data.functionCount > 0 && (
          <span className="text-[10px] text-gray-500">
            {data.functionCount} fn{data.functionCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="text-[10px] text-gray-600 mt-1 font-mono">{data.ucId}</div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-indigo-400 !border-gray-900 !w-3 !h-3"
      />
    </div>
  )
})

UseCaseNode.displayName = 'UseCaseNode'
