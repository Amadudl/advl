/**
 * index.ts — ADVL Agent Process entry point
 *
 * Starts the WebSocket server that the Core UI connects to.
 * Routes incoming messages to the appropriate agent handler.
 * In Electron mode: spawned as a child process by packages/electron/src/main.ts
 * In Server mode: spawned as a child process by packages/server/src/index.ts
 */
import { WebSocketServer, WebSocket } from 'ws'
import { agentCore } from './agent.core.js'
import type { AgentMessage } from '@advl/shared'
import { AGENT_MESSAGE_TYPES, DEFAULT_AGENT_PORT } from '@advl/shared'

const PORT = parseInt(process.env['ADVL_AGENT_PORT'] ?? String(DEFAULT_AGENT_PORT), 10)
const LOG_LEVEL = process.env['ADVL_AGENT_LOG_LEVEL'] ?? 'info'

function log(level: string, ...args: unknown[]): void {
  if (level === 'debug' && LOG_LEVEL !== 'debug') return
  console.log(`[ADVL Agent][${level.toUpperCase()}]`, ...args)
}

const wss = new WebSocketServer({ port: PORT })

log('info', `Agent WebSocket server starting on port ${PORT}`)
log('info', `LLM provider: ${process.env['ADVL_LLM_PROVIDER'] ?? 'not configured'}`)

wss.on('listening', () => {
  log('info', `Agent ready — listening on ws://localhost:${PORT}`)
  // Signal to parent process that agent is ready
  if (process.send) {
    process.send({ type: 'AGENT_READY', port: PORT })
  }
})

wss.on('connection', (ws: WebSocket, req) => {
  const clientIp = req.socket.remoteAddress ?? 'unknown'
  log('info', `Client connected from ${clientIp}`)

  const sendStatus = (status: string, msg: string) => {
    ws.send(JSON.stringify({
      id: crypto.randomUUID(),
      type: 'AGENT_STATUS',
      payload: { status, message: msg },
      timestamp: new Date().toISOString(),
    }))
  }

  ws.on('message', async (data) => {
    let message: AgentMessage | null = null

    try {
      message = JSON.parse(data.toString()) as AgentMessage
    } catch {
      log('warn', 'Received unparseable message:', data.toString().slice(0, 100))
      return
    }

    log('info', `→ [${message.type}] id=${message.id.slice(0, 8)}`)

    try {
      const response = await routeMessage(message, sendStatus)
      if (response) {
        ws.send(JSON.stringify(response))
        const responsePayload = response.payload as { message?: string; success?: boolean }
        const preview = typeof responsePayload?.message === 'string'
          ? responsePayload.message.slice(0, 80).replace(/\n/g, ' ')
          : ''
        log('info', `← [${response.type}] success=${responsePayload?.success ?? '?'} ${preview ? `| "${preview}${preview.length === 80 ? '…' : ''}"` : ''}`)
      }
    } catch (err) {
      const errorResponse: AgentMessage = {
        id: crypto.randomUUID(),
        type: AGENT_MESSAGE_TYPES.AGENT_ERROR,
        payload: {
          code: 'AGENT_HANDLER_ERROR',
          message: String(err),
        },
        timestamp: new Date().toISOString(),
        replyTo: message.id,
      }
      ws.send(JSON.stringify(errorResponse))
      log('warn', `Error handling [${message.type}]:`, err)
    }
  })

  ws.on('close', () => {
    log('info', `Client disconnected from ${clientIp}`)
  })

  ws.on('error', (err) => {
    log('warn', 'WebSocket error:', err.message)
  })

  // Send initial status
  const statusMessage: AgentMessage = {
    id: crypto.randomUUID(),
    type: AGENT_MESSAGE_TYPES.AGENT_STATUS,
    payload: { status: 'idle', message: 'Agent connected and ready' },
    timestamp: new Date().toISOString(),
  }
  ws.send(JSON.stringify(statusMessage))
})

wss.on('error', (err) => {
  log('warn', 'WebSocket server error:', err.message)
  process.exit(1)
})

async function routeMessage(
  message: AgentMessage,
  sendStatus: (status: string, msg: string) => void,
): Promise<AgentMessage | null> {
  switch (message.type) {
    case AGENT_MESSAGE_TYPES.USE_CASE_SUBMIT:
      return agentCore.handleUseCaseSubmit(message)
    case AGENT_MESSAGE_TYPES.AGENT_QUERY:
      return agentCore.handleAgentQuery(message)
    case AGENT_MESSAGE_TYPES.DCM_QUERY:
      return agentCore.handleDCMQuery(message)
    case AGENT_MESSAGE_TYPES.DCM_UPDATE:
      return agentCore.handleDCMUpdate(message)
    case AGENT_MESSAGE_TYPES.META_INJECT:
      return agentCore.handleMetaInject(message)
    case AGENT_MESSAGE_TYPES.CODE_GENERATE:
      return agentCore.handleCodeGenerate(message)
    case AGENT_MESSAGE_TYPES.RULE_VALIDATE:
      return agentCore.handleRuleValidate(message)
    case 'BOOTSTRAP_PROJECT':
      return agentCore.handleBootstrapProject(message, sendStatus)
    case 'FIX_VIOLATION':
      return agentCore.handleFixViolation(message)
    default:
      log('warn', `Unknown message type: ${message.type}`)
      return null
  }
}
