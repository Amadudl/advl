/**
 * features/dcm-viewer/index.tsx — DCM inspection panel feature stub
 *
 * Read-only view of the current project's DCM.yaml contents.
 * Shows registered use cases, their status, and linked functions.
 * TODO: Read DCM from dcm.store
 * TODO: Render use case list with status badges (planned/in_progress/implemented/deprecated)
 * TODO: Show function details and endpoint on use case expand
 * TODO: Highlight selected use case when a canvas element is clicked
 */
export function DCMViewerFeature() {
  return (
    <div className="p-3">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        DCM Viewer
      </div>
      <div className="text-xs text-gray-600 italic">
        {/* TODO: Render use case list from dcm.store */}
        {/* TODO: Status badges */}
        {/* TODO: Function/endpoint details on expand */}
        No use cases registered
      </div>
    </div>
  )
}
