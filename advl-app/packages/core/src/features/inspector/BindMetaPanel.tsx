/**
 * features/inspector/BindMetaPanel.tsx — Meta Injection Binder UI
 *
 * UC-009: "User injects advl_meta into a visual component via Canvas/IDE"
 *
 * Rendered inside the InspectorPanel when a useCaseNode or functionNode is
 * selected. Provides:
 *   - File path input (relative or absolute)
 *   - Component / element name input (e.g. "button", "SubmitButton")
 *   - Visual Element ID input (VE-Entity-Action pattern, pre-filled from node)
 *   - "Bind Meta" submit button → calls meta-injector.service.injectMeta()
 *
 * On success: green confirmation with the line number that was injected.
 * On failure: red banner with the descriptive reason from the engine.
 *
 * advl_meta on Bind Meta button → VE-MetaInjector-Bind / UC-009
 *
 * UC-009 / VE-MetaInjector-Bind
 */
import { useState } from 'react'
import { injectMeta } from '../../services/meta-injector.service'
import type { AdvlMeta, InjectionResult } from '../../services/meta-injector.service'
import { useWorkspaceStore } from '../../store/workspace.store'
import type { UseCaseNodeData } from '../canvas/nodes/UseCaseNode'
import type { FunctionNodeData } from '../canvas/nodes/FunctionNode'

const UC009_META = {
  use_case_id: 'UC-009',
  use_case_title: 'User injects advl_meta into a visual component via Canvas/IDE',
  function: 'injectMeta',
  file: 'packages/core/src/services/meta-injector.service.ts',
  line: 128,
  endpoint: null,
  db_tables: [],
  auth_required: false,
  last_verified: '2026-02-27',
  dcm_version: '1.0',
  visual_element_id: 'VE-MetaInjector-Bind',
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface BindMetaPanelProps {
  nodeType: 'useCaseNode' | 'functionNode'
  nodeData: UseCaseNodeData | FunctionNodeData
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function prefillFromNode(
  nodeType: 'useCaseNode' | 'functionNode',
  nodeData: UseCaseNodeData | FunctionNodeData,
): { filePath: string; componentName: string; veId: string; ucId: string; fnName: string } {
  if (nodeType === 'functionNode') {
    const fn = nodeData as FunctionNodeData
    return {
      filePath: fn.file ?? '',
      componentName: fn.name ?? '',
      veId: '',
      ucId: '',
      fnName: fn.name ?? '',
    }
  }
  const uc = nodeData as UseCaseNodeData
  return {
    filePath: '',
    componentName: '',
    veId: uc.ucId ? `VE-${uc.ucId.replace('UC-', 'Uc')}-Action` : '',
    ucId: uc.ucId ?? '',
    fnName: '',
  }
}

function buildMeta(
  ucId: string,
  ucTitle: string,
  fnName: string,
  filePath: string,
  veId: string,
  lineNum: number,
): AdvlMeta {
  const today = new Date().toISOString().split('T')[0] ?? '2026-01-01'
  return {
    use_case_id: ucId,
    use_case_title: ucTitle,
    function: fnName,
    file: filePath,
    line: lineNum,
    endpoint: null,
    db_tables: [],
    auth_required: false,
    last_verified: today,
    dcm_version: '1.0',
    visual_element_id: veId,
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BindMetaPanel({ nodeType, nodeData }: BindMetaPanelProps) {
  const { project } = useWorkspaceStore()

  const prefill = prefillFromNode(nodeType, nodeData)

  const [filePath, setFilePath] = useState(prefill.filePath)
  const [componentName, setComponentName] = useState(prefill.componentName)
  const [veId, setVeId] = useState(prefill.veId)
  const [ucId, setUcId] = useState(prefill.ucId)
  const [ucTitle, setUcTitle] = useState(
    nodeType === 'useCaseNode' ? (nodeData as UseCaseNodeData).title ?? '' : '',
  )
  const [fnName, setFnName] = useState(prefill.fnName)
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<InjectionResult | null>(null)

  const isValid =
    filePath.trim().length > 0 &&
    componentName.trim().length > 0 &&
    veId.trim().length > 0 &&
    ucId.trim().length > 0

  function resolveAbsolutePath(): string {
    const p = filePath.trim()
    if (p.startsWith('/') || /^[A-Za-z]:\\/.test(p) || p.startsWith('\\\\')) return p
    if (project?.root) return `${project.root}/${p}`
    return p
  }

  async function handleBind(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || isRunning) return

    setIsRunning(true)
    setResult(null)

    const meta = buildMeta(ucId.trim(), ucTitle.trim(), fnName.trim(), filePath.trim(), veId.trim(), 0)
    const absPath = resolveAbsolutePath()

    const outcome = await injectMeta(absPath, componentName.trim(), meta)
    setResult(outcome)
    setIsRunning(false)
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-800">
      <div className="text-[10px] text-violet-500 uppercase tracking-wider font-semibold mb-2">
        Bind advl_meta
      </div>

      {result?.success && (
        <div className="mb-2 text-xs text-emerald-400 bg-emerald-950/40 rounded px-2 py-1.5 border border-emerald-800/40">
          ✓ Injected at line {result.lineInjected}
          {result.previouslyHadMeta && ' (replaced existing meta)'}
        </div>
      )}

      {result && !result.success && (
        <div className="mb-2 text-xs text-red-400 bg-red-950/30 rounded px-2 py-1.5 border border-red-800/40 break-words">
          ✗ {result.reason}
        </div>
      )}

      <form onSubmit={handleBind} className="flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <label htmlFor="bmp-file-path" className="text-[9px] text-gray-600 uppercase tracking-wider">
            File Path <span className="text-red-500">*</span>
          </label>
          <input
            id="bmp-file-path"
            type="text"
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            disabled={isRunning}
            placeholder="src/features/auth/LoginButton.tsx"
            className="bg-gray-800 text-gray-200 text-[10px] font-mono rounded px-2 py-1 outline-none placeholder-gray-700 disabled:opacity-50 focus:ring-1 focus:ring-violet-700"
          />
        </div>

        <div className="flex flex-col gap-0.5">
          <label htmlFor="bmp-component-name" className="text-[9px] text-gray-600 uppercase tracking-wider">
            Component / Element Name <span className="text-red-500">*</span>
          </label>
          <input
            id="bmp-component-name"
            type="text"
            value={componentName}
            onChange={(e) => setComponentName(e.target.value)}
            disabled={isRunning}
            placeholder="button, LoginButton, form…"
            className="bg-gray-800 text-gray-200 text-[10px] font-mono rounded px-2 py-1 outline-none placeholder-gray-700 disabled:opacity-50 focus:ring-1 focus:ring-violet-700"
          />
        </div>

        <div className="flex flex-col gap-0.5">
          <label htmlFor="bmp-uc-id" className="text-[9px] text-gray-600 uppercase tracking-wider">
            Use Case ID <span className="text-red-500">*</span>
          </label>
          <input
            id="bmp-uc-id"
            type="text"
            value={ucId}
            onChange={(e) => setUcId(e.target.value)}
            disabled={isRunning}
            placeholder="UC-001"
            className="bg-gray-800 text-gray-200 text-[10px] font-mono rounded px-2 py-1 outline-none placeholder-gray-700 disabled:opacity-50 focus:ring-1 focus:ring-violet-700"
          />
        </div>

        <div className="flex flex-col gap-0.5">
          <label htmlFor="bmp-uc-title" className="text-[9px] text-gray-600 uppercase tracking-wider">UC Title</label>
          <input
            id="bmp-uc-title"
            type="text"
            value={ucTitle}
            onChange={(e) => setUcTitle(e.target.value)}
            disabled={isRunning}
            placeholder="User logs in…"
            className="bg-gray-800 text-gray-200 text-[10px] rounded px-2 py-1 outline-none placeholder-gray-700 disabled:opacity-50 focus:ring-1 focus:ring-violet-700"
          />
        </div>

        <div className="flex flex-col gap-0.5">
          <label htmlFor="bmp-fn-name" className="text-[9px] text-gray-600 uppercase tracking-wider">Function Name</label>
          <input
            id="bmp-fn-name"
            type="text"
            value={fnName}
            onChange={(e) => setFnName(e.target.value)}
            disabled={isRunning}
            placeholder="handleLogin"
            className="bg-gray-800 text-gray-200 text-[10px] font-mono rounded px-2 py-1 outline-none placeholder-gray-700 disabled:opacity-50 focus:ring-1 focus:ring-violet-700"
          />
        </div>

        <div className="flex flex-col gap-0.5">
          <label htmlFor="bmp-ve-id" className="text-[9px] text-gray-600 uppercase tracking-wider">
            Visual Element ID <span className="text-red-500">*</span>
          </label>
          <input
            id="bmp-ve-id"
            type="text"
            value={veId}
            onChange={(e) => setVeId(e.target.value)}
            disabled={isRunning}
            placeholder="VE-Login-Submit"
            className="bg-gray-800 text-gray-200 text-[10px] font-mono rounded px-2 py-1 outline-none placeholder-gray-700 disabled:opacity-50 focus:ring-1 focus:ring-violet-700"
          />
        </div>

        <button
          type="submit"
          disabled={!isValid || isRunning}
          data-advl-meta={JSON.stringify(UC009_META)}
          className="text-[10px] bg-violet-700 hover:bg-violet-600 disabled:opacity-40 text-white rounded px-3 py-1.5 transition-colors self-end mt-1 font-semibold"
        >
          {isRunning ? 'Injecting…' : '⟵ Bind Meta'}
        </button>
      </form>
    </div>
  )
}
