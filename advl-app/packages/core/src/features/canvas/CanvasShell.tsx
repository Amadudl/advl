/**
 * CanvasShell.tsx — Layer switcher shell for all ADVL canvas layers
 *
 * Currently active: Layer 2 (User Flow).
 * Layer 1 (Data Flow) and Layer 3 (UI / 2D) are registered but not yet implemented.
 */
import { useState } from 'react'
import { UserFlowCanvas, DCMArchCanvas } from './UserFlowCanvas'

type Layer = 'user-flow' | 'data-flow' | 'ui-2d'

interface LayerConfig {
  id: Layer
  label: string
  icon: string
  available: boolean
}

const LAYERS: LayerConfig[] = [
  { id: 'user-flow', label: 'User Flow', icon: '🗺️', available: true },
  { id: 'data-flow', label: 'DCM Graph', icon: '🔗', available: true },
  { id: 'ui-2d', label: 'UI / 2D', icon: '🎨', available: false },
]

export function CanvasShell() {
  const [activeLayer, setActiveLayer] = useState<Layer>('user-flow')

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-3 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
        {LAYERS.map((layer) => (
          <button
            key={layer.id}
            onClick={() => { if (layer.available) setActiveLayer(layer.id) }}
            disabled={!layer.available}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium',
              'transition-colors duration-100',
              activeLayer === layer.id
                ? 'bg-indigo-900 text-indigo-200 border border-indigo-500/50'
                : layer.available
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                  : 'text-gray-600 cursor-not-allowed',
            ].join(' ')}
          >
            <span>{layer.icon}</span>
            <span>{layer.label}</span>
            {!layer.available && (
              <span className="text-gray-700 text-[10px]">(bald)</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeLayer === 'user-flow' && <UserFlowCanvas />}
        {activeLayer === 'data-flow' && <DCMArchCanvas />}
        {activeLayer === 'ui-2d' && (
          <div className="flex items-center justify-center h-full text-gray-600">
            <div className="text-center">
              <div className="text-4xl mb-2">🎨</div>
              <div className="text-sm">Layer 3 — UI / 2D Editor</div>
              <div className="text-xs text-gray-700 mt-1">Visual Editor · Meta-Injection Canvas</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
