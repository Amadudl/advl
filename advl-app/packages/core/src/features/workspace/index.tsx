/**
 * features/workspace/index.tsx — Workspace feature stub
 *
 * Shows the open project, its file tree, and use case list.
 * TODO: Implement project open/close via platform.openFolderDialog()
 * TODO: Implement file tree using platform.readDir() recursively
 * TODO: Implement use case list by reading from dcm.store
 */
export function WorkspaceFeature() {
  return (
    <div className="p-3">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Workspace
      </div>
      <div className="text-xs text-gray-600 italic">
        {/* TODO: Show open project name and use case list */}
        No project open
      </div>
    </div>
  )
}
