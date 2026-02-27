/**
 * App.tsx — Root component for ADVL Core
 *
 * Renders the application shell: sidebar navigation + main content area.
 * Feature components are mounted here as stubs. Platform adapter is
 * initialized and available via the platform singleton.
 */
import { platform } from './platform/adapter.factory'

import { WorkspaceFeature } from './features/workspace'
import { UseCaseEditorFeature } from './features/use-case-editor'
import { DCMViewerFeature } from './features/dcm-viewer'
import { AgentChatFeature } from './features/agent-chat'

const platformInfo = platform.getPlatformInfo()

export default function App() {
  return (
    <div className="flex h-full bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <aside className="w-16 flex flex-col items-center py-4 bg-gray-900 border-r border-gray-800 gap-4">
        <div className="text-xs font-bold text-blue-400 tracking-widest rotate-0">ADVL</div>
        <nav className="flex flex-col gap-2 mt-4">
          <SidebarIcon label="WS" title="Workspace" />
          <SidebarIcon label="UC" title="Use Case Editor" />
          <SidebarIcon label="DC" title="DCM Viewer" />
          <SidebarIcon label="AI" title="Agent Chat" />
        </nav>
        <div className="mt-auto">
          <div
            className="text-xs text-gray-600 text-center px-1"
            title={`Mode: ${platformInfo.mode}`}
          >
            {platformInfo.mode === 'electron' ? '⬛' : '🌐'}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left panel — Workspace/Project tree */}
        <section className="w-64 border-r border-gray-800 overflow-y-auto">
          <WorkspaceFeature />
        </section>

        {/* Right panel — Use Case Editor + DCM Viewer */}
        <section className="w-80 border-l border-gray-800 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto border-b border-gray-800">
            <UseCaseEditorFeature />
          </div>
          <div className="flex-1 overflow-y-auto">
            <DCMViewerFeature />
          </div>
        </section>
      </main>

      {/* Bottom — Agent Chat */}
      <div className="fixed bottom-0 right-0 w-80 h-64 border-t border-l border-gray-800 bg-gray-900">
        <AgentChatFeature />
      </div>
    </div>
  )
}

function SidebarIcon({ label, title }: { label: string; title: string }) {
  return (
    <button
      title={title}
      className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-mono text-gray-400 hover:text-gray-100 transition-colors"
    >
      {label}
    </button>
  )
}
