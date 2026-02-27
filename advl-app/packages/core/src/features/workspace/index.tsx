/**
 * features/workspace/index.tsx — Workspace panel
 *
 * Shows the open project name and DCM use case list.
 * Open Project button triggers platform.openFolderDialog() via workspace.store.
 * Use case list reads from dcm.store — populated after DCM.yaml is loaded.
 */
import { useWorkspaceStore } from '../../store/workspace.store'
import { useDCMStore } from '../../store/dcm.store'

export function WorkspaceFeature() {
  const { project, isLoading, error, openProjectDialog, closeProject } = useWorkspaceStore()
  const { dcm } = useDCMStore()

  return (
    <div className="p-3 flex flex-col gap-3">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Workspace
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-950 rounded px-2 py-1">{error}</div>
      )}

      {!project ? (
        <button
          onClick={() => { void openProjectDialog() }}
          disabled={isLoading}
          className="text-xs bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white rounded px-3 py-1.5 transition-colors"
        >
          {isLoading ? 'Opening…' : 'Open Project'}
        </button>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono text-blue-400 truncate" title={project.root}>
              {project.name}
            </div>
            <button
              onClick={closeProject}
              className="text-xs text-gray-600 hover:text-red-400 ml-2"
              title="Close project"
            >
              ✕
            </button>
          </div>

          <div className="text-xs text-gray-600">
            {project.hasExistingDCM ? '✓ DCM found' : '⚠ No DCM.yaml'}
          </div>

          {dcm && dcm.use_cases.length > 0 ? (
            <div className="flex flex-col gap-1">
              <div className="text-xs text-gray-500 uppercase tracking-wider">Use Cases</div>
              {dcm.use_cases.map((uc) => (
                <div
                  key={uc.id}
                  className="text-xs text-gray-300 bg-gray-800 rounded px-2 py-1 flex items-center justify-between"
                >
                  <span className="font-mono text-gray-500 mr-2">{uc.id}</span>
                  <span className="truncate flex-1">{uc.title}</span>
                  <span className={`ml-2 text-xs px-1 rounded ${
                    uc.status === 'implemented' ? 'bg-green-900 text-green-400' :
                    uc.status === 'in_progress' ? 'bg-yellow-900 text-yellow-400' :
                    uc.status === 'deprecated' ? 'bg-gray-700 text-gray-500' :
                    'bg-gray-800 text-gray-500'
                  }`}>
                    {uc.status}
                  </span>
                </div>
              ))}
            </div>
          ) : dcm ? (
            <div className="text-xs text-gray-600 italic">No use cases registered</div>
          ) : null}
        </>
      )}
    </div>
  )
}
