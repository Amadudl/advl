/**
 * store/agent.store.ts — Agent communication Zustand store
 *
 * Manages the agent connection state and message history.
 * Sends messages via the platform adapter and receives responses via callbacks.
 *
 * Incoming AGENT_RESPONSE messages are parsed by parseAgentResponse():
 *   - payload.message → displayed in chat
 *   - payload.data.use_case (when DCM_UPDATE) → forwarded to dcm.store.updateUseCase()
 *
 * UC-003 — VE-AgentChat-Submit
 */
import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { AgentMessage, AgentMessageType, AgentResponsePayload, AgentStatus, UseCase } from '@advl/shared'
import { AGENT_MESSAGE_TYPES } from '@advl/shared'
import { platform } from '../platform/adapter.factory'
import { useDCMStore } from './dcm.store'

export interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  timestamp: string
  success?: boolean
  raw?: AgentMessage
}

interface AgentState {
  status: AgentStatus
  messages: ChatMessage[]
  isConnected: boolean

  sendMessage: (type: AgentMessageType, payload: unknown) => Promise<void>
  submitUseCase: (description: string) => Promise<void>
  sendQuery: (prompt: string) => Promise<void>
  addUserMessage: (content: string) => void
  addAgentMessage: (message: AgentMessage) => void
  setStatus: (status: AgentStatus) => void
  setConnected: (connected: boolean) => void
}

/**
 * Parse an incoming AGENT_RESPONSE payload into a human-readable chat string.
 *
 * Priority:
 *   1. payload.message — the agent's prose reply
 *   2. payload.data — JSON fallback if no message field present
 *
 * Side-effects (UC-007):
 *   - If payload.data.use_case is present → forward to dcm.store.updateUseCase()
 *     so the canvas reflects the new/updated UC immediately without a page reload.
 *
 * UC-003 / UC-007
 */
function parseAgentResponse(message: AgentMessage): { content: string; success: boolean } {
  const payload = message.payload as AgentResponsePayload | undefined

  if (!payload) {
    return { content: '(empty response)', success: false }
  }

  // Forward DCM updates to the UI store — UC-007 implementation loop
  if (payload.data && typeof payload.data === 'object') {
    const data = payload.data as Record<string, unknown>
    if (data['use_case']) {
      useDCMStore.getState().updateUseCase(data['use_case'] as UseCase)
    }
  }

  const content = payload.message
    ?? (payload.data !== undefined ? JSON.stringify(payload.data, null, 2) : '(no message)')

  return { content, success: payload.success ?? true }
}

export const useAgentStore = create<AgentState>((set, get) => {
  platform.onAgentMessage((message: AgentMessage) => {
    get().addAgentMessage(message)
  })

  return {
    status: 'idle',
    messages: [],
    isConnected: false,

    sendMessage: async (type: AgentMessageType, payload: unknown) => {
      const message: AgentMessage = {
        id: uuidv4(),
        type,
        payload,
        timestamp: new Date().toISOString(),
      }
      await platform.sendToAgent(message)
    },

    submitUseCase: async (description: string) => {
      get().addUserMessage(description)
      set({ status: 'thinking' })
      try {
        await get().sendMessage(AGENT_MESSAGE_TYPES.USE_CASE_SUBMIT, { description })
      } catch (err) {
        set({ status: 'error' })
        get().addAgentMessage({
          id: uuidv4(),
          type: AGENT_MESSAGE_TYPES.AGENT_RESPONSE,
          payload: { success: false, message: `Transport error: ${String(err)}` },
          timestamp: new Date().toISOString(),
        })
      }
    },

    /**
     * Send a free-form natural language query to the agent.
     * Uses AGENT_QUERY type — agent.core routes this through the LLM
     * with the full ADVL system prompt + DCM context.
     *
     * UC-003 / VE-AgentChat-Submit
     */
    sendQuery: async (prompt: string) => {
      get().addUserMessage(prompt)
      set({ status: 'thinking' })
      try {
        await get().sendMessage(AGENT_MESSAGE_TYPES.AGENT_QUERY, { prompt })
      } catch (err) {
        set({ status: 'error' })
        get().addAgentMessage({
          id: uuidv4(),
          type: AGENT_MESSAGE_TYPES.AGENT_RESPONSE,
          payload: { success: false, message: `Transport error: ${String(err)}` },
          timestamp: new Date().toISOString(),
        })
      }
    },

    addUserMessage: (content: string) => {
      set((state) => ({
        messages: [
          ...state.messages,
          {
            id: uuidv4(),
            role: 'user',
            content,
            timestamp: new Date().toISOString(),
          },
        ],
      }))
    },

    addAgentMessage: (message: AgentMessage) => {
      const { content, success } = parseAgentResponse(message)

      set((state) => ({
        messages: [
          ...state.messages,
          {
            id: uuidv4(),
            role: 'agent',
            content,
            success,
            timestamp: message.timestamp,
            raw: message,
          },
        ],
        status: 'idle',
      }))
    },

    setStatus: (status: AgentStatus) => set({ status }),
    setConnected: (isConnected: boolean) => set({ isConnected }),
  }
})
