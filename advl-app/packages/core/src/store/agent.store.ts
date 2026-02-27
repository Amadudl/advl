/**
 * store/agent.store.ts — Agent communication Zustand store
 *
 * Manages the agent connection state and message history.
 * Sends messages via the platform adapter and receives responses via callbacks.
 * TODO: Wire onAgentMessage callback to platform adapter on store init
 * TODO: Implement submitUseCase() to send USE_CASE_SUBMIT message
 * TODO: Handle incoming DCM_UPDATE messages → update dcm.store
 * TODO: Handle incoming META_INJECT messages → update visual element metadata
 */
import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { AgentMessage, AgentMessageType, AgentStatus } from '@advl/shared'
import { AGENT_MESSAGE_TYPES } from '@advl/shared'
import { platform } from '../platform/adapter.factory'

export interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  timestamp: string
  raw?: AgentMessage
}

interface AgentState {
  status: AgentStatus
  messages: ChatMessage[]
  isConnected: boolean

  // Actions
  sendMessage: (type: AgentMessageType, payload: unknown) => Promise<void>
  submitUseCase: (description: string) => Promise<void>
  addUserMessage: (content: string) => void
  addAgentMessage: (message: AgentMessage) => void
  setStatus: (status: AgentStatus) => void
  setConnected: (connected: boolean) => void
}

export const useAgentStore = create<AgentState>((set, get) => {
  // Register agent message listener when store is first created
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
      await get().sendMessage(AGENT_MESSAGE_TYPES.USE_CASE_SUBMIT, { description })
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
      // TODO: Parse structured ADVL Agent Response format into readable content
      const content = typeof message.payload === 'string'
        ? message.payload
        : JSON.stringify(message.payload, null, 2)

      set((state) => ({
        messages: [
          ...state.messages,
          {
            id: uuidv4(),
            role: 'agent',
            content,
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
