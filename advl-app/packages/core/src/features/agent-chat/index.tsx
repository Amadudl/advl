/**
 * features/agent-chat/index.tsx — Agent communication panel
 *
 * Renders agent message history from agent.store.
 * Status indicator reflects real agent.store.status.
 * Input submits via agent.store.submitUseCase().
 */
import { useRef, useEffect, useState } from 'react'
import { useAgentStore } from '../../store/agent.store'

const STATUS_LABEL: Record<string, string> = {
  idle: '● idle',
  thinking: '◌ thinking',
  writing: '✎ writing',
  error: '✗ error',
}

const STATUS_COLOR: Record<string, string> = {
  idle: 'text-gray-600',
  thinking: 'text-yellow-500',
  writing: 'text-blue-400',
  error: 'text-red-400',
}

export function AgentChatFeature() {
  const { status, messages, submitUseCase } = useAgentStore()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const isThinking = status === 'thinking' || status === 'writing'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isThinking) return
    void submitUseCase(trimmed)
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent</span>
        <span className={`text-xs ${STATUS_COLOR[status] ?? 'text-gray-600'}`}>
          {STATUS_LABEL[status] ?? status}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {messages.length === 0 && (
          <div className="text-xs text-gray-600 italic p-1">Agent ready. Describe a use case to begin.</div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`text-xs rounded px-2 py-1.5 max-w-full whitespace-pre-wrap break-words ${
              msg.role === 'user'
                ? 'bg-blue-900 text-blue-100 self-end ml-4'
                : 'bg-gray-800 text-gray-300 self-start mr-4'
            }`}
          >
            {msg.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-2 border-t border-gray-800 flex gap-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isThinking}
          placeholder="Describe a use case…"
          className="flex-1 bg-gray-800 text-gray-200 text-xs rounded px-2 py-1.5 outline-none placeholder-gray-600 disabled:opacity-50 focus:ring-1 focus:ring-blue-700"
        />
        <button
          type="submit"
          disabled={!input.trim() || isThinking}
          className="text-xs bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white rounded px-2 py-1.5 transition-colors"
        >
          ↵
        </button>
      </form>
    </div>
  )
}
