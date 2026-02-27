/**
 * services/agent.service.ts — Agent communication service
 *
 * Low-level service for formatting and sending messages to the Agent process.
 * Used by agent.store.ts. Has no UI dependencies.
 * TODO: Implement sendUseCaseSubmit()
 * TODO: Implement sendDCMQuery()
 * TODO: Implement sendRuleValidate()
 */
import { v4 as uuidv4 } from 'uuid'
import type { AgentMessage, UseCaseSubmitPayload, DCMQueryPayload } from '@advl/shared'
import { AGENT_MESSAGE_TYPES } from '@advl/shared'
import { platform } from '../platform/adapter.factory'

export const agentService = {
  /**
   * Submit a plain-language use case description to the agent.
   * The agent will: check DCM for duplicates → translate to UC → implement or reuse.
   */
  async sendUseCaseSubmit(payload: UseCaseSubmitPayload): Promise<void> {
    const message: AgentMessage = {
      id: uuidv4(),
      type: AGENT_MESSAGE_TYPES.USE_CASE_SUBMIT,
      payload,
      timestamp: new Date().toISOString(),
    }
    await platform.sendToAgent(message)
  },

  /**
   * Query the agent to check if existing DCM functions satisfy an intent.
   * Returns via onAgentMessage callback with type AGENT_RESPONSE.
   */
  async sendDCMQuery(payload: DCMQueryPayload): Promise<void> {
    const message: AgentMessage = {
      id: uuidv4(),
      type: AGENT_MESSAGE_TYPES.DCM_QUERY,
      payload,
      timestamp: new Date().toISOString(),
    }
    await platform.sendToAgent(message)
  },

  /**
   * Request rule compliance validation from the agent.
   * TODO: Define what subject types trigger which rule checks
   */
  async sendRuleValidate(subject: string, data: unknown): Promise<void> {
    const message: AgentMessage = {
      id: uuidv4(),
      type: AGENT_MESSAGE_TYPES.RULE_VALIDATE,
      payload: { subject, data },
      timestamp: new Date().toISOString(),
    }
    await platform.sendToAgent(message)
  },
}
