/**
 * App.tsx — ADVL Visual IDE shell
 *
 * Layout: narrow left sidebar | left panel (workspace) | main canvas | right inspector panel
 * Main canvas renders CanvasShell (Layer 2 User Flow by default).
 * Agent chat is overlaid bottom-right.
 *
 * DEV_DCM seed: pre-loads a DCMDocument with screens and navigation edges so
 * the canvas has data immediately. Replaced by real data when a project is
 * opened (loadDCM) or the agent sends a DCM_LOADED message (loadDocument).
 */
import { useEffect } from 'react'
import { platform } from './platform/adapter.factory'
import { useDCMStore } from './store/dcm.store'
import { CanvasShell } from './features/canvas/CanvasShell'
import { WorkspaceFeature } from './features/workspace'
import { DCMViewerFeature } from './features/dcm-viewer'
import { AgentChatFeature } from './features/agent-chat'
import { InspectorPanel } from './features/inspector'
import { UseCaseEditorFeature } from './features/use-case-editor'
import { ProjectInitFeature } from './features/project-init'
import { ComplianceDashboard } from './features/compliance'
import { useState } from 'react'
import type { DCMDocument } from '@advl/shared'


const DEV_DCM: DCMDocument = {
  version: '1.0',
  project: 'ADVL Demo',
  use_cases: [
    {
      id: 'uc_001',
      title: 'User logs in',
      name: 'User logs in',
      value: 'User gains access to their dashboard',
      actor: 'User',
      visual_element_id: 'screen_login',
      preconditions: [],
      postconditions: ['screen_id: screen_dashboard'],
      status: 'implemented',
      functions: [],
      rules_applied: [],
      deprecated_date: null,
      deprecated_reason: null,
      replaced_by: null,
    },
    {
      id: 'uc_002',
      title: 'User registers',
      name: 'User registers',
      value: 'New user creates an account',
      actor: 'User',
      visual_element_id: 'screen_login',
      preconditions: [],
      postconditions: ['screen_id: screen_onboarding'],
      status: 'planned',
      functions: [],
      rules_applied: [],
      deprecated_date: null,
      deprecated_reason: null,
      replaced_by: null,
    },
    {
      id: 'uc_003',
      title: 'Complete onboarding',
      name: 'Complete onboarding',
      value: 'User completes setup and reaches dashboard',
      actor: 'User',
      visual_element_id: 'screen_onboarding',
      preconditions: [],
      postconditions: ['screen_id: screen_dashboard'],
      status: 'planned',
      functions: [],
      rules_applied: [],
      deprecated_date: null,
      deprecated_reason: null,
      replaced_by: null,
    },
    {
      id: 'uc_004',
      title: 'View project detail',
      name: 'View project detail',
      value: 'User inspects a project and its DCM',
      actor: 'Developer',
      visual_element_id: 'screen_dashboard',
      preconditions: [],
      postconditions: ['screen_id: screen_project_detail'],
      status: 'implemented',
      functions: [],
      rules_applied: [],
      deprecated_date: null,
      deprecated_reason: null,
      replaced_by: null,
    },
  ],
  visual_elements: [
    { id: 'screen_login', type: 'screen', name: 'Login', route: '/login' },
    { id: 'screen_dashboard', type: 'screen', name: 'Dashboard', route: '/dashboard' },
    { id: 'screen_onboarding', type: 'screen', name: 'Onboarding', route: '/onboarding' },
    { id: 'screen_project_detail', type: 'screen', name: 'Project Detail', route: '/project/:id' },
    { id: 'screen_settings', type: 'screen', name: 'Settings', route: '/settings' },
  ],
}

const platformInfo = platform.getPlatformInfo()

type LeftTab = 'workspace' | 'init'
type RightTab = 'inspector' | 'compliance'

export default function App() {
  const { loadDocument, document: dcm } = useDCMStore()
  const [leftTab, setLeftTab] = useState<LeftTab>('workspace')
  const [rightTab, setRightTab] = useState<RightTab>('inspector')

  useEffect(() => {
    if (!dcm) {
      loadDocument(DEV_DCM)
    }
  }, [dcm, loadDocument])

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Narrow icon sidebar */}
      <aside className="w-12 flex flex-col items-center py-3 bg-gray-900 border-r border-gray-800 gap-3 shrink-0">
        <div className="text-[10px] font-bold text-indigo-400 tracking-widest">ADVL</div>
        <div className="flex-1" />
        <div
          className="text-xs text-gray-600 pb-1"
          title={`Mode: ${platformInfo.mode}`}
        >
          {platformInfo.mode === 'electron' ? '⬛' : '🌐'}
        </div>
      </aside>

      {/* Left panel — tabbed: Workspace / Init Project */}
      <aside className="w-56 border-r border-gray-800 bg-gray-900 flex flex-col overflow-hidden shrink-0">
        <div className="flex border-b border-gray-800 shrink-0">
          <button
            onClick={() => setLeftTab('workspace')}
            className={`flex-1 text-[10px] uppercase tracking-wider py-2 font-semibold transition-colors ${
              leftTab === 'workspace' ? 'text-white border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            Workspace
          </button>
          <button
            onClick={() => setLeftTab('init')}
            className={`flex-1 text-[10px] uppercase tracking-wider py-2 font-semibold transition-colors ${
              leftTab === 'init' ? 'text-white border-b-2 border-indigo-600' : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            Init
          </button>
        </div>
        {leftTab === 'workspace' && (
          <>
            <div className="shrink-0 border-b border-gray-800">
              <WorkspaceFeature />
            </div>
            <div className="shrink-0 border-b border-gray-800 max-h-40 overflow-y-auto">
              <DCMViewerFeature />
            </div>
            <div className="flex-1 overflow-y-auto">
              <UseCaseEditorFeature />
            </div>
          </>
        )}
        {leftTab === 'init' && (
          <div className="flex-1 overflow-y-auto">
            <ProjectInitFeature />
          </div>
        )}
      </aside>

      {/* Main canvas */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <CanvasShell />
      </main>

      {/* Right panel — tabbed: Inspector / Compliance */}
      <aside className="w-64 border-l border-gray-800 bg-gray-900 shrink-0 flex flex-col overflow-hidden">
        <div className="flex border-b border-gray-800 shrink-0">
          <button
            onClick={() => setRightTab('inspector')}
            className={`flex-1 text-[10px] uppercase tracking-wider py-2 font-semibold transition-colors ${
              rightTab === 'inspector' ? 'text-white border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            Inspector
          </button>
          <button
            onClick={() => setRightTab('compliance')}
            className={`flex-1 text-[10px] uppercase tracking-wider py-2 font-semibold transition-colors ${
              rightTab === 'compliance' ? 'text-white border-b-2 border-violet-600' : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            Compliance
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {rightTab === 'inspector' ? <InspectorPanel /> : <ComplianceDashboard />}
        </div>
      </aside>

      {/* Agent chat overlay */}
      <div className="fixed bottom-0 right-60 w-80 h-64 border-t border-l border-gray-800 bg-gray-900 z-20">
        <AgentChatFeature />
      </div>
    </div>
  )
}
