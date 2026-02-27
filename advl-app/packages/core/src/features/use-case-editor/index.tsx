/**
 * features/use-case-editor/index.tsx — Use case editor
 *
 * Submits a plain-language use case description to the agent.
 * Wired to agent.store.submitUseCase() which sends USE_CASE_SUBMIT
 * to the agent WebSocket. Agent responds via onAgentMessage callback.
 */
import { useState } from 'react'
import { useAgentStore } from '../../store/agent.store'
import { useWorkspaceStore } from '../../store/workspace.store'

export function UseCaseEditorFeature() {
  const { status, submitUseCase } = useAgentStore()
  const { project } = useWorkspaceStore()
  const [description, setDescription] = useState('')

  const isThinking = status === 'thinking' || status === 'writing'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = description.trim()
    if (!trimmed || isThinking) return
    void submitUseCase(trimmed)
    setDescription('')
  }

  return (
    <div className="p-3 flex flex-col gap-3">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Use Case Editor
      </div>

      {!project && (
        <div className="text-xs text-gray-600 italic">Open a project first</div>
      )}

      {project && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e as unknown as React.FormEvent)
            }}
            disabled={isThinking}
            placeholder="Describe a use case in plain language…&#10;e.g. The developer opens a project folder and the DCM is loaded automatically."
            rows={4}
            className="w-full bg-gray-800 text-gray-200 text-xs rounded px-2 py-1.5 outline-none placeholder-gray-600 resize-none disabled:opacity-50 focus:ring-1 focus:ring-blue-700"
          />
          <button
            type="submit"
            disabled={!description.trim() || isThinking}
            className="text-xs bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white rounded px-3 py-1.5 transition-colors self-end"
          >
            {isThinking ? 'Agent working…' : 'Submit to Agent ↵'}
          </button>
        </form>
      )}
    </div>
  )
}
