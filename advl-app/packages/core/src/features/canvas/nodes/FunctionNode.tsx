/**
 * nodes/FunctionNode.tsx — React Flow custom node for a DCM Function entry
 *
 * advl_meta: UC-002 / VE-Canvas-Flow
 */
import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'

export interface FunctionNodeData extends Record<string, unknown> {
  name: string
  file: string
  line: number
  endpoint: string | null
  authRequired: boolean
  dbTables: string[]
}

export const FunctionNode = memo(({ data: rawData, selected }: NodeProps) => {
  const data = rawData as FunctionNodeData
  const shortFile = data.file.split('/').slice(-2).join('/')

  return (
    <div
      className={[
        'min-w-[180px] max-w-[220px] rounded-lg border-2 p-2.5',
        'bg-gray-900 text-white shadow-md',
        'transition-all duration-150',
        'border-violet-500/40',
        selected ? 'ring-2 ring-violet-400 ring-offset-1 ring-offset-gray-900' : '',
      ].join(' ')}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-violet-400 !border-gray-900 !w-3 !h-3"
      />

      <div className="flex items-start gap-1.5 mb-1">
        <span className="text-sm mt-0.5">⚙️</span>
        <span className="font-mono font-semibold text-xs text-violet-300 truncate" title={data.name}>
          {data.name}
        </span>
      </div>

      <div className="text-[10px] text-gray-500 font-mono truncate" title={data.file}>
        {shortFile}:{data.line}
      </div>

      {data.endpoint && (
        <div className="text-[10px] text-blue-400 font-mono mt-1 truncate" title={data.endpoint}>
          {data.endpoint}
        </div>
      )}

      <div className="flex items-center gap-2 mt-1.5">
        {data.authRequired && (
          <span className="text-[10px] bg-amber-900/60 text-amber-400 px-1 rounded">auth</span>
        )}
        {data.dbTables.length > 0 && (
          <span className="text-[10px] text-gray-500">
            {data.dbTables.join(', ')}
          </span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-violet-400 !border-gray-900 !w-3 !h-3"
      />
    </div>
  )
})

FunctionNode.displayName = 'FunctionNode'
