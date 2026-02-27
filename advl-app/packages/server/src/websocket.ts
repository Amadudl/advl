/**
 * websocket.ts — WebSocket server for agent communication in server mode
 *
 * Upgrades HTTP connections at /ws to WebSocket.
 * Proxies messages between the browser client and the agent process.
 * The agent runs as a child process on localhost:7433.
 */
import { WebSocketServer, WebSocket } from 'ws'
import type { IncomingMessage } from 'node:http'
import type { Server } from 'node:http'
import type { AgentMessage } from '@advl/shared'
import { DEFAULT_AGENT_PORT } from '@advl/shared'

export function setupWebSocket(httpServer: Server): void {
  const wss = new WebSocketServer({ noServer: true })

  const agentPort = parseInt(process.env['ADVL_AGENT_PORT'] ?? String(DEFAULT_AGENT_PORT), 10)
  let agentWs: WebSocket | null = null
  const pendingClients = new Set<WebSocket>()

  function connectToAgent(): void {
    agentWs = new WebSocket(`ws://localhost:${agentPort}`)

    agentWs.on('open', () => {
      console.log(`[WS] Connected to agent on port ${agentPort}`)
    })

    agentWs.on('message', (data) => {
      // Forward agent messages to all connected browser clients
      const message = data.toString()
      for (const client of pendingClients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message)
        }
      }
    })

    agentWs.on('close', () => {
      console.log('[WS] Agent connection closed — retrying in 2s')
      agentWs = null
      setTimeout(connectToAgent, 2000)
    })

    agentWs.on('error', (err) => {
      console.error('[WS] Agent connection error:', err.message)
    })
  }

  // Connect to agent after a short delay to allow agent to start
  setTimeout(connectToAgent, 1000)

  // Handle browser client upgrades
  httpServer.on('upgrade', (req: IncomingMessage, socket, head) => {
    const pathname = new URL(req.url ?? '', `http://${req.headers.host}`).pathname

    if (pathname === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req)
      })
    } else {
      socket.destroy()
    }
  })

  wss.on('connection', (ws: WebSocket) => {
    pendingClients.add(ws)
    console.log(`[WS] Browser client connected (${pendingClients.size} total)`)

    ws.on('message', (data) => {
      // Forward browser messages to the agent
      if (agentWs?.readyState === WebSocket.OPEN) {
        agentWs.send(data.toString())
      } else {
        // Agent not ready — send error back to browser
        const errorMsg: AgentMessage = {
          id: crypto.randomUUID(),
          type: 'AGENT_ERROR',
          payload: { code: 'AGENT_NOT_CONNECTED', message: 'Agent is not connected' },
          timestamp: new Date().toISOString(),
        }
        ws.send(JSON.stringify(errorMsg))
      }
    })

    ws.on('close', () => {
      pendingClients.delete(ws)
      console.log(`[WS] Browser client disconnected (${pendingClients.size} remaining)`)
    })
  })
}
