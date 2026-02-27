/**
 * features/agent-chat/index.tsx — Agent communication panel
 *
 * Renders agent message history from agent.store.
 * Status indicator reflects real agent.store.status.
 *
 * Two send paths:
 *   Enter / ↵ button  → sendQuery()  (AGENT_QUERY — free-form NL, routed through LLM)
 *   Shift+Enter       → submitUseCase() (USE_CASE_SUBMIT — structured UC registration)
 *
 * advl_meta injected on both interactive elements per META_INJECTION.md.
 *
 * UC-003 / VE-AgentChat-Submit
 */
import { useRef, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useAgentStore } from '../../store/agent.store'

const UC003_META = {
  use_case_id: 'UC-003',
  use_case_title: 'User queries the ADVL Agent via natural language',
  function: 'sendQuery',
  file: 'packages/core/src/store/agent.store.ts',
  line: 120,
  endpoint: null,
  db_tables: [],
  auth_required: false,
  last_verified: '2026-02-27',
  dcm_version: '1.0',
  visual_element_id: 'VE-AgentChat-Submit',
}

const STATUS_LABEL: Record<string, string> = {
  idle: '● idle',
  thinking: '◌ thinking…',
  writing: '✎ writing…',
  error: '✗ error',
}

const STATUS_COLOR: Record<string, string> = {
  idle: 'text-gray-600',
  thinking: 'text-yellow-500 animate-pulse',
  writing: 'text-blue-400 animate-pulse',
  error: 'text-red-400',
}

export function AgentChatFeature() {
  const { status, messages, sendQuery, submitUseCase } = useAgentStore()
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
    sendQuery(trimmed).catch(() => undefined)
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      const trimmed = input.trim()
      if (!trimmed || isThinking) return
      submitUseCase(trimmed).catch(() => undefined)
      setInput('')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent</span>
        <span className={`text-xs ${STATUS_COLOR[status] ?? 'text-gray-600'}`}>
          {STATUS_LABEL[status] ?? status}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
        {messages.length === 0 && (
          <div className="text-xs text-gray-600 italic p-1">
            Agent ready. Ask anything or Shift+Enter to submit a Use Case.
          </div>
        )}
        {messages.map((msg) => {
          let bubbleClass: string
          if (msg.role === 'user') {
            bubbleClass = 'bg-blue-900/80 text-blue-100 self-end ml-4'
          } else if (msg.success === false) {
            bubbleClass = 'bg-red-950/60 text-red-300 self-start mr-4 border border-red-800/40'
          } else {
            bubbleClass = 'bg-gray-800 text-gray-300 self-start mr-4'
          }
          return (
            <div
              key={msg.id}
              className={`text-xs rounded px-2 py-1.5 max-w-full break-words ${bubbleClass}`}
            >
              {msg.role === 'agent' ? (
                <ReactMarkdown
                  components={{
                    code: ({ className, children, ...props }) => {
                      const isBlock = className?.includes('language-')
                      return isBlock ? (
                        <pre className="bg-gray-950 rounded p-2 mt-1 mb-1 overflow-x-auto text-[11px] leading-relaxed">
                          <code className={className} {...props}>{children}</code>
                        </pre>
                      ) : (
                        <code className="bg-gray-950 rounded px-1 font-mono" {...props}>{children}</code>
                      )
                    },
                    p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc ml-4 mb-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal ml-4 mb-1">{children}</ol>,
                    strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-2 border-t border-gray-800 flex gap-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isThinking}
          placeholder={isThinking ? 'Agent thinking…' : 'Ask the agent… (Shift+Enter for UC)'}
          data-advl-meta={JSON.stringify(UC003_META)}
          className="flex-1 bg-gray-800 text-gray-200 text-xs rounded px-2 py-1.5 outline-none placeholder-gray-600 disabled:opacity-50 focus:ring-1 focus:ring-blue-700"
        />
        <button
          type="submit"
          disabled={!input.trim() || isThinking}
          data-advl-meta={JSON.stringify({ ...UC003_META, function: 'sendQuery' })}
          className="text-xs bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white rounded px-2 py-1.5 transition-colors"
          title="Send query (Enter)"
        >
          ↵
        </button>
      </form>
    </div>
  )
}
