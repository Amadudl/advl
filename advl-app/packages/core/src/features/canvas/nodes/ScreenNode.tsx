/**
 * nodes/ScreenNode.tsx — React Flow custom node for a DCM Screen element
 *
 * Renders a single screen from DCMDocument.visual_elements.
 * Connected to data from dcm.store via buildFlowGraph.
 * Handles (target) and source handles for navigation edges.
 */
import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { ScreenNodeData } from '../utils/dcm-to-flow'

const STATUS_COLORS: Record<string, string> = {
  implemented: 'border-green-500/60 bg-green-950/20',
  planned: 'border-yellow-500/60 bg-yellow-950/20',
  mixed: 'border-blue-500/60 bg-blue-950/20',
}

export const ScreenNode = memo(({ data: rawData, selected }: NodeProps) => {
  const data = rawData as ScreenNodeData
  const borderColor = STATUS_COLORS[data.status] ?? STATUS_COLORS['planned']

  return (
    <div
      className={[
        'min-w-[180px] rounded-lg border-2 p-3',
        'bg-gray-900 text-white shadow-lg',
        'transition-all duration-150',
        borderColor,
        selected ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-gray-900' : '',
      ].join(' ')}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-indigo-400 !border-gray-900 !w-3 !h-3"
      />

      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🖥</span>
        <span className="font-semibold text-sm truncate">{data.name}</span>
      </div>

      {data.route && (
        <div className="text-xs text-gray-400 font-mono mb-2 truncate">
          {data.route}
        </div>
      )}

      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500">UCs:</span>
        <span
          className={[
            'text-xs px-1.5 py-0.5 rounded font-mono',
            data.useCaseCount > 0
              ? 'bg-indigo-900 text-indigo-300'
              : 'bg-gray-800 text-gray-500',
          ].join(' ')}
        >
          {data.useCaseCount}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-indigo-400 !border-gray-900 !w-3 !h-3"
      />
    </div>
  )
})

ScreenNode.displayName = 'ScreenNode'
