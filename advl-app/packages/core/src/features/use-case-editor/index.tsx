/**
 * features/use-case-editor/index.tsx — Use case editor feature stub
 *
 * Panel where the developer describes a use case in plain language.
 * The agent receives the submission, checks the DCM, and responds.
 * TODO: Implement text input for use case description
 * TODO: Wire submit to agent.store.submitUseCase()
 * TODO: Display agent's DCM check result (reuse found / new UC created)
 * TODO: Show precondition/postcondition fields after agent validates intent
 */
export function UseCaseEditorFeature() {
  return (
    <div className="p-3">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Use Case Editor
      </div>
      <div className="text-xs text-gray-600 italic">
        {/* TODO: Use case description input */}
        {/* TODO: Actor, value fields */}
        {/* TODO: Submit button wired to agent */}
        Describe a use case to begin
      </div>
    </div>
  )
}
