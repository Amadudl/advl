/**
 * features/canvas/index.tsx — Visual design canvas feature stub
 *
 * The main canvas where visual elements are placed, connected, and inspected.
 * Each element on the canvas corresponds to a use case via advl_meta.
 * TODO: Implement canvas rendering using CanvasState from visual.store (future)
 * TODO: Implement drag-and-drop element placement
 * TODO: Implement element selection and advl_meta display on click
 * TODO: Implement zoom/pan controls
 */
export function CanvasFeature() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-950 relative">
      <div className="text-center text-gray-700">
        <div className="text-4xl mb-3">⬜</div>
        <div className="text-sm font-mono">Canvas</div>
        <div className="text-xs mt-1 text-gray-600">
          {/* TODO: Render visual elements from canvas store */}
          Open a project to begin
        </div>
      </div>
      {/* TODO: Canvas grid background */}
      {/* TODO: Visual element renderer */}
      {/* TODO: Selection overlay */}
      {/* TODO: Zoom controls */}
    </div>
  )
}
