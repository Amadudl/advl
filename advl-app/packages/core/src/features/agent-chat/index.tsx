/**
 * features/agent-chat/index.tsx — Agent communication panel feature stub
 *
 * Shows the conversation between the developer and the ADVL agent.
 * The agent responds with DCM check results, implementation plans, and compliance reports.
 * TODO: Render message history from agent.store
 * TODO: Show agent status indicator (idle/thinking/writing/error)
 * TODO: Wire input to agent.store.sendMessage()
 * TODO: Render structured ADVL Agent Response format (UC ref, DCM check, compliance)
 */
export function AgentChatFeature() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Agent
        </span>
        <span className="text-xs text-gray-600">
          {/* TODO: Show agent status (idle/thinking/writing/error) */}
          ● idle
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 text-xs text-gray-600 italic">
        {/* TODO: Render agent message history from agent.store */}
        Agent ready. Describe a use case to begin.
      </div>
      <div className="p-2 border-t border-gray-800">
        <input
          type="text"
          disabled
          placeholder="Describe a use case... (TODO: wire to agent)"
          className="w-full bg-gray-800 text-gray-400 text-xs rounded px-2 py-1.5 outline-none placeholder-gray-600 cursor-not-allowed"
        />
      </div>
    </div>
  )
}
