/**
 * features/compliance/index.tsx — ADVL Compliance Dashboard
 *
 * UC-008: "System validates project compliance against ADVL Rulebooks"
 *
 * Provides a "Run Checks" button that invokes compliance.engine.runComplianceChecks()
 * against the currently open project. Results are grouped by rule and displayed as:
 *   - Green summary banner: "All Checks Passed"
 *   - Red/amber grouped list of Errors and Warnings by rule
 *   - Gray pass count
 *
 * Requires an open project (workspace.store.project).
 * advl_meta on Run Checks button → VE-Compliance-Runner / UC-008
 *
 * UC-008 / VE-Compliance-Runner
 */
import { useState } from 'react'
import { useWorkspaceStore } from '../../store/workspace.store'
import { runComplianceChecks } from '../../services/compliance.engine'
import type { ComplianceReport, ComplianceItem } from '../../services/compliance.engine'

const UC008_META = {
  use_case_id: 'UC-008',
  use_case_title: 'System validates project compliance against ADVL Rulebooks',
  function: 'runComplianceChecks',
  file: 'packages/core/src/services/compliance.engine.ts',
  line: 242,
  endpoint: null,
  db_tables: [],
  auth_required: false,
  last_verified: '2026-02-27',
  dcm_version: '1.0',
  visual_element_id: 'VE-Compliance-Runner',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupByRule(items: ComplianceItem[]): Map<string, ComplianceItem[]> {
  const map = new Map<string, ComplianceItem[]>()
  for (const item of items) {
    const existing = map.get(item.rule) ?? []
    existing.push(item)
    map.set(item.rule, existing)
  }
  return map
}

function RuleGroup({
  rule,
  items,
  variant,
}: {
  rule: string
  items: ComplianceItem[]
  variant: 'error' | 'warning'
}) {
  const [expanded, setExpanded] = useState(true)
  const colors =
    variant === 'error'
      ? { bg: 'bg-red-950/30', border: 'border-red-800/40', title: 'text-red-400', dot: 'text-red-500', badge: 'bg-red-900/50 text-red-300' }
      : { bg: 'bg-yellow-950/20', border: 'border-yellow-800/30', title: 'text-yellow-400', dot: 'text-yellow-500', badge: 'bg-yellow-900/40 text-yellow-300' }

  return (
    <div className={`rounded border ${colors.bg} ${colors.border}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-2 py-1.5 text-left"
      >
        <span className={`text-[10px] font-bold uppercase tracking-wider ${colors.title}`}>
          {rule}
        </span>
        <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${colors.badge}`}>
          {items.length} {variant === 'error' ? 'error' : 'warn'}{items.length !== 1 ? 's' : ''}
        </span>
      </button>
      {expanded && (
        <div className="px-2 pb-2 flex flex-col gap-1">
          {items.map((item) => (
            <div key={`${item.rule}:${item.detail}`} className="flex gap-1.5 items-start">
              <span className={`mt-0.5 shrink-0 ${colors.dot}`}>{variant === 'error' ? '✗' : '⚠'}</span>
              <span className="text-[10px] text-gray-400 break-words">{item.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * ComplianceDashboard — UC-008
 * advl_meta: UC-008 / VE-Compliance-Runner
 */
export function ComplianceDashboard() {
  const { project } = useWorkspaceStore()
  const [report, setReport] = useState<ComplianceReport | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)

  async function handleRun() {
    if (!project || isRunning) return
    setIsRunning(true)
    setRunError(null)
    setReport(null)
    try {
      const result = await runComplianceChecks(project.root)
      setReport(result)
    } catch (e) {
      setRunError(String(e))
    } finally {
      setIsRunning(false)
    }
  }

  const errorGroups = report ? groupByRule(report.errors) : new Map()
  const warnGroups = report ? groupByRule(report.warnings) : new Map()
  const allClear = report?.errors.length === 0 && report?.warnings.length === 0
  const ran = new Date(report?.ranAt ?? '').toLocaleTimeString()

  return (
    <div className="p-3 flex flex-col gap-3 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Compliance
        </div>
        {report && (
          <span className="text-[10px] text-gray-700">{ran}</span>
        )}
      </div>

      {!project && (
        <div className="text-xs text-gray-600 italic">Open a project first</div>
      )}

      {project && (
        <>
          <button
            type="button"
            onClick={() => { handleRun().catch(() => undefined) }}
            disabled={isRunning}
            data-advl-meta={JSON.stringify(UC008_META)}
            className="text-xs bg-violet-700 hover:bg-violet-600 disabled:opacity-40 text-white rounded px-3 py-1.5 transition-colors"
          >
            {isRunning ? 'Running checks…' : '▶ Run Compliance Checks'}
          </button>

          {runError && (
            <div className="text-xs text-red-400 bg-red-950/30 rounded px-2 py-1.5 border border-red-800/40">
              Engine error: {runError}
            </div>
          )}

          {report && allClear && (
            <div className="text-xs text-emerald-400 bg-emerald-950/40 rounded px-2 py-2 border border-emerald-800/40 flex items-center gap-2">
              <span className="text-base">✓</span>
              <div>
                <div className="font-semibold">All checks passed</div>
                <div className="text-[10px] text-emerald-700 mt-0.5">
                  {report.passes.length} checks passed · 0 errors · 0 warnings
                </div>
              </div>
            </div>
          )}

          {report && !allClear && (
            <div className="flex flex-col gap-2">
              <div className="text-[10px] text-gray-600 flex gap-3">
                <span className="text-red-400">{report.errors.length} errors</span>
                <span className="text-yellow-400">{report.warnings.length} warnings</span>
                <span className="text-gray-600">{report.passes.length} passed</span>
              </div>

              {[...errorGroups.entries()].map(([rule, items]) => (
                <RuleGroup key={rule} rule={rule} items={items} variant="error" />
              ))}

              {[...warnGroups.entries()].map(([rule, items]) => (
                <RuleGroup key={rule} rule={rule} items={items} variant="warning" />
              ))}
            </div>
          )}

          {report && (
            <div className="text-[10px] text-gray-700 border-t border-gray-800 pt-2 mt-1">
              {report.passes.length} check{report.passes.length !== 1 ? 's' : ''} passed — project: {report.projectRoot}
            </div>
          )}
        </>
      )}
    </div>
  )
}
