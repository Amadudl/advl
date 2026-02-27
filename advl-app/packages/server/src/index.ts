/**
 * index.ts — ADVL Server Shell entry point
 *
 * Starts Express on ADVL_SERVER_PORT (default 3000).
 * Serves the built Core app as static files.
 * Spawns the Agent as a child process.
 * Upgrades /ws connections to WebSocket for agent communication.
 */
import express from 'express'
import cors from 'cors'
import { createServer } from 'node:http'
import { spawn, ChildProcess } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { ADVL_VERSION, DEFAULT_SERVER_PORT, DEFAULT_AGENT_PORT } from '@advl/shared'
import apiRouter from './api.router.js'
import { setupWebSocket } from './websocket.js'
import { setupStaticMiddleware } from './static.middleware.js'
import { authMiddleware } from './auth.middleware.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = parseInt(process.env['ADVL_SERVER_PORT'] ?? String(DEFAULT_SERVER_PORT), 10)
const isDev = process.env['NODE_ENV'] === 'development'

let agentProcess: ChildProcess | null = null

function startAgent(): void {
  const agentEntryPoint = isDev
    ? path.join(__dirname, '../../agent/src/index.ts')
    : path.join(__dirname, '../../agent/dist/index.js')

  const command = isDev ? 'tsx' : 'node'

  agentProcess = spawn(command, [agentEntryPoint], {
    env: {
      ...process.env,
      ADVL_AGENT_PORT: process.env['ADVL_AGENT_PORT'] ?? String(DEFAULT_AGENT_PORT),
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  agentProcess.stdout?.on('data', (data: Buffer) => {
    process.stdout.write(`[Agent] ${data.toString()}`)
  })

  agentProcess.stderr?.on('data', (data: Buffer) => {
    process.stderr.write(`[Agent Error] ${data.toString()}`)
  })

  agentProcess.on('exit', (code) => {
    console.log(`[Server] Agent exited with code ${code}`)
    agentProcess = null
  })

  console.log(`[Server] Agent process started (${command} ${agentEntryPoint})`)
}

const app = express()
const httpServer = createServer(app)

// Middleware
app.use(cors())
app.use(express.json())
app.use(authMiddleware)

// API routes
app.use('/api', apiRouter)

// WebSocket (must be before static so /ws is handled by upgrade)
setupWebSocket(httpServer)

// Static files (Core app) — must be last
setupStaticMiddleware(app)

// Start agent and listen
startAgent()

httpServer.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════╗`)
  console.log(`║  ADVL Server v${ADVL_VERSION}                         ║`)
  console.log(`║  Mode: server                                ║`)
  console.log(`║  URL:  http://localhost:${PORT}                 ║`)
  console.log(`║  Agent port: ${process.env['ADVL_AGENT_PORT'] ?? String(DEFAULT_AGENT_PORT)}                         ║`)
  console.log(`╚══════════════════════════════════════════════╝\n`)
})

process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received — shutting down')
  agentProcess?.kill()
  httpServer.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received — shutting down')
  agentProcess?.kill()
  httpServer.close(() => process.exit(0))
})
