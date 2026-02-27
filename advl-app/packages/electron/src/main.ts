/**
 * main.ts — Electron main process entry point
 *
 * Responsibilities:
 * - Create the BrowserWindow loading ADVL Core
 * - Spawn the Agent as a child process
 * - Register IPC handlers for filesystem and OS operations
 * - Handle app lifecycle events (ready, window-all-closed, activate)
 *
 * In development: loads Core from Vite dev server (http://localhost:5173)
 * In production: loads Core from the built dist/ directory
 */
import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { spawn, ChildProcess } from 'node:child_process'
import { createMainWindow } from './window.js'
import { registerIpcHandlers } from './ipc.handlers.js'

const isDev = process.env['NODE_ENV'] === 'development'
let agentProcess: ChildProcess | null = null
let mainWindow: BrowserWindow | null = null

function startAgent(): void {
  const agentEntryPoint = isDev
    ? path.join(__dirname, '../../agent/src/index.ts')
    : path.join(__dirname, '../../agent/dist/index.js')

  const command = isDev ? 'tsx' : 'node'

  agentProcess = spawn(command, [agentEntryPoint], {
    env: {
      ...process.env,
      ADVL_AGENT_PORT: process.env['ADVL_AGENT_PORT'] ?? '7433',
    },
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  })

  agentProcess.stdout?.on('data', (data: Buffer) => {
    console.log('[Agent]', data.toString().trim())
  })

  agentProcess.stderr?.on('data', (data: Buffer) => {
    console.error('[Agent Error]', data.toString().trim())
  })

  agentProcess.on('exit', (code) => {
    console.log(`[Agent] Process exited with code ${code}`)
    agentProcess = null
  })

  agentProcess.on('message', (msg: unknown) => {
    const message = msg as { type: string; port: number }
    if (message.type === 'AGENT_READY') {
      console.log(`[Main] Agent ready on port ${message.port}`)
    }
  })
}

// Top-level await is unavailable in this CJS package (module: Node16, no "type":"module").
// .then() is the correct pattern here — not a code smell in this context.
app.whenReady().then(() => {
  registerIpcHandlers()
  startAgent()

  mainWindow = createMainWindow()

  if (isDev) {
    // Load from Vite dev server
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // Load from built dist
    const coreDist = path.join(__dirname, '../../core/dist/index.html')
    mainWindow.loadFile(coreDist)
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
})

app.on('window-all-closed', () => {
  // On macOS, apps stay running until explicitly quit
  if (process.platform !== 'darwin') {
    agentProcess?.kill()
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked with no windows open
  if (BrowserWindow.getAllWindows().length === 0 && mainWindow === null) {
    mainWindow = createMainWindow()
  }
})

app.on('before-quit', () => {
  agentProcess?.kill()
})
