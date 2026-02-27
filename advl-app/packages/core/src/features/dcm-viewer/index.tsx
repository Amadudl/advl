/**
 * features/dcm-viewer/index.tsx — DCM inspection panel
 *
 * Read-only view of the current project's DCM.yaml.
 * Reads from dcm.store (populated by dcmService.readDCM after project open).
 * Shows use cases with status badges and linked function details.
 */
import { useState } from 'react'
import { useDCMStore } from '../../store/dcm.store'
import { useWorkspaceStore } from '../../store/workspace.store'
import type { UseCase } from '@advl/shared'

const STATUS_COLORS: Record<string, string> = {
  implemented: 'bg-green-900 text-green-400',
  in_progress: 'bg-yellow-900 text-yellow-400',
  deprecated: 'bg-gray-700 text-gray-500',
  planned: 'bg-gray-800 text-gray-400',
}

export function DCMViewerFeature() {
  const { dcm, isLoading, error } = useDCMStore()
  const { project } = useWorkspaceStore()
  const [expanded, setExpanded] = useState<string | null>(null)

  if (!project) {
    return (
      <div className="p-3 text-xs text-gray-600 italic">No project open</div>
    )
  }

  if (isLoading) {
    return <div className="p-3 text-xs text-gray-500">Loading DCM…</div>
  }

  if (error) {
    return (
      <div className="p-3 text-xs text-red-400 bg-red-950 rounded m-2">
        DCM error: {error}
      </div>
    )
  }

  if (!dcm) {
    return (
      <div className="p-3 text-xs text-gray-600 italic">
        No DCM.yaml found — use Init to create one
      </div>
    )
  }

  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          DCM v{dcm.version}
        </div>
        <div className="text-xs text-gray-600">{dcm.use_cases.length} UCs</div>
      </div>

      {dcm.use_cases.length === 0 && (
        <div className="text-xs text-gray-600 italic">No use cases registered</div>
      )}

      {dcm.use_cases.map((uc: UseCase) => (
        <div key={uc.id} className="border border-gray-800 rounded">
          <button
            onClick={() => setExpanded(expanded === uc.id ? null : uc.id)}
            className="w-full text-left px-2 py-1.5 flex items-center gap-2 hover:bg-gray-800 transition-colors"
          >
            <span className="font-mono text-gray-500 text-xs">{uc.id}</span>
            <span className="text-xs text-gray-300 flex-1 truncate">{uc.title}</span>
            <span className={`text-xs px-1 rounded ${STATUS_COLORS[uc.status] ?? STATUS_COLORS['planned']}`}>
              {uc.status}
            </span>
          </button>

          {expanded === uc.id && (
            <div className="px-2 pb-2 flex flex-col gap-1 border-t border-gray-800">
              {uc.value && (
                <div className="text-xs text-gray-500 italic mt-1">{uc.value}</div>
              )}
              {uc.functions.length > 0 && (
                <div className="flex flex-col gap-0.5 mt-1">
                  {uc.functions.map((fn) => (
                    <div key={fn.name} className="text-xs font-mono text-gray-400 flex items-center gap-2">
                      <span className="text-blue-500">{fn.name}</span>
                      {fn.endpoint && (
                        <span className="text-gray-600">{fn.endpoint}</span>
                      )}
                      {fn.file && (
                        <span className="text-gray-700 truncate">{fn.file}:{fn.line}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
