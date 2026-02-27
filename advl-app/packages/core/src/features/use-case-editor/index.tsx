/**
 * features/use-case-editor/index.tsx — Structured Use Case Editor
 *
 * Full form mapped to the DCM use_case schema:
 *   Title, Value (business value), Actor, Preconditions[], Postconditions[]
 *
 * On submit: serialises fields into a structured description string and
 * dispatches agent.store.submitUseCase() → USE_CASE_SUBMIT → agent backend.
 * The agent backend uses this structure to register in DCM.yaml (UC-007).
 *
 * advl_meta on submit button → VE-UseCaseEditor-Submit / UC-006.
 *
 * UC-006 / VE-UseCaseEditor-Submit
 */
import { useState } from 'react'
import { useAgentStore } from '../../store/agent.store'
import { useWorkspaceStore } from '../../store/workspace.store'

const UC006_META = {
  use_case_id: 'UC-006',
  use_case_title: 'User translates a requirement into a structured Use Case via UI',
  function: 'submitUseCase',
  file: 'packages/core/src/store/agent.store.ts',
  line: 97,
  endpoint: null,
  db_tables: [],
  auth_required: false,
  last_verified: '2026-02-27',
  dcm_version: '1.0',
  visual_element_id: 'VE-UseCaseEditor-Submit',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ArrayField({
  label,
  items,
  onChange,
  placeholder,
  disabled,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
  disabled: boolean
}) {
  function update(index: number, value: string) {
    const next = [...items]
    next[index] = value
    onChange(next)
  }

  function add() {
    onChange([...items, ''])
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-gray-600 uppercase tracking-wider">{label}</span>
      {items.map((item, i) => {
        const fieldId = `${label.toLowerCase().replace(/\s+/g, '-')}-${i}`
        return (
          <div key={fieldId} className="flex items-center gap-1">
            <input
              id={fieldId}
              aria-label={`${label} item ${i + 1}`}
              type="text"
              value={item}
              onChange={(e) => update(i, e.target.value)}
              disabled={disabled}
              placeholder={placeholder}
              className="flex-1 bg-gray-800 text-gray-200 text-xs rounded px-2 py-1 outline-none placeholder-gray-600 disabled:opacity-50 focus:ring-1 focus:ring-blue-700"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={disabled}
              aria-label={`Remove ${label} item ${i + 1}`}
              className="text-gray-700 hover:text-red-400 text-xs px-1 disabled:opacity-40"
              title="Remove"
            >
              ✕
            </button>
          </div>
        )
      })}
      <button
        type="button"
        onClick={add}
        disabled={disabled}
        className="text-[10px] text-gray-600 hover:text-blue-400 text-left disabled:opacity-40 mt-0.5"
      >
        + Add {label.toLowerCase().replace(/s$/, '')}
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function UseCaseEditorFeature() {
  const { status, submitUseCase } = useAgentStore()
  const { project } = useWorkspaceStore()

  const [title, setTitle] = useState('')
  const [value, setValue] = useState('')
  const [actor, setActor] = useState('')
  const [preconditions, setPreconditions] = useState<string[]>([''])
  const [postconditions, setPostconditions] = useState<string[]>([''])
  const [submitted, setSubmitted] = useState(false)

  const isThinking = status === 'thinking' || status === 'writing'
  const isValid = title.trim().length > 0 && value.trim().length > 0 && actor.trim().length > 0

  function buildDescription(): string {
    const pre = preconditions.filter((p) => p.trim()).map((p) => `  - ${p}`).join('\n')
    const post = postconditions.filter((p) => p.trim()).map((p) => `  - ${p}`).join('\n')

    return [
      `TITLE: ${title.trim()}`,
      `VALUE: ${value.trim()}`,
      `ACTOR: ${actor.trim()}`,
      pre ? `PRECONDITIONS:\n${pre}` : '',
      post ? `POSTCONDITIONS:\n${post}` : '',
    ].filter(Boolean).join('\n')
  }

  function reset() {
    setTitle('')
    setValue('')
    setActor('')
    setPreconditions([''])
    setPostconditions([''])
    setSubmitted(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || isThinking) return
    submitUseCase(buildDescription()).catch(() => undefined)
    setSubmitted(true)
  }

  return (
    <div className="p-3 flex flex-col gap-3 overflow-y-auto h-full">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Use Case Editor
      </div>

      {!project && (
        <div className="text-xs text-gray-600 italic">Open a project first</div>
      )}

      {project && submitted && !isThinking && (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-emerald-400 bg-emerald-950/40 rounded px-2 py-1.5 border border-emerald-800/40">
            Use case submitted to agent. Check the Agent panel for the response.
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-blue-400 hover:text-blue-300 text-left"
          >
            + Submit another use case
          </button>
        </div>
      )}

      {project && !submitted && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-600 uppercase tracking-wider">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isThinking}
              placeholder="User opens the workspace…"
              className="bg-gray-800 text-gray-200 text-xs rounded px-2 py-1.5 outline-none placeholder-gray-600 disabled:opacity-50 focus:ring-1 focus:ring-blue-700"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-600 uppercase tracking-wider">
              Business Value <span className="text-red-500">*</span>
            </label>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={isThinking}
              placeholder="Establishes project context so the agent can operate with full DCM awareness…"
              rows={2}
              className="bg-gray-800 text-gray-200 text-xs rounded px-2 py-1.5 outline-none placeholder-gray-600 resize-none disabled:opacity-50 focus:ring-1 focus:ring-blue-700"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-600 uppercase tracking-wider">
              Actor <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              disabled={isThinking}
              placeholder="ADVL User (Developer/Architect)"
              className="bg-gray-800 text-gray-200 text-xs rounded px-2 py-1.5 outline-none placeholder-gray-600 disabled:opacity-50 focus:ring-1 focus:ring-blue-700"
            />
          </div>

          <ArrayField
            label="Preconditions"
            items={preconditions}
            onChange={setPreconditions}
            placeholder="Workspace must be open…"
            disabled={isThinking}
          />

          <ArrayField
            label="Postconditions"
            items={postconditions}
            onChange={setPostconditions}
            placeholder="DCM is loaded into memory…"
            disabled={isThinking}
          />

          <button
            type="submit"
            disabled={!isValid || isThinking}
            data-advl-meta={JSON.stringify(UC006_META)}
            className="text-xs bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white rounded px-3 py-1.5 transition-colors self-end mt-1"
          >
            {isThinking ? 'Agent working…' : 'Submit Use Case ↵'}
          </button>
        </form>
      )}
    </div>
  )
}
