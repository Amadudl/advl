/**
 * window.ts — Electron BrowserWindow configuration
 *
 * Creates and configures the main application window.
 * Remembers last window size/position and restores it on launch.
 * Minimum size enforced: 800x600.
 */
import { BrowserWindow, screen } from 'electron'
import path from 'node:path'

interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
}

// Default window dimensions
const DEFAULT_WIDTH = 1280
const DEFAULT_HEIGHT = 800
const MIN_WIDTH = 800
const MIN_HEIGHT = 600

// Simple in-memory window state (replace with electron-store for persistence)
let savedState: WindowState = { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }

export function createMainWindow(): BrowserWindow {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

  // Center window if no saved position
  const x = savedState.x ?? Math.floor((screenWidth - savedState.width) / 2)
  const y = savedState.y ?? Math.floor((screenHeight - savedState.height) / 2)

  const win = new BrowserWindow({
    x,
    y,
    width: savedState.width,
    height: savedState.height,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    title: 'ADVL — AI Development Visual Language',
    show: false, // Show only after content is loaded to avoid flash
    backgroundColor: '#0f1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,    // Required for contextBridge security
      nodeIntegration: false,     // Never enable — security risk
      sandbox: false,             // Required for preload to work with contextBridge
    },
  })

  // Show window once ready to avoid white flash
  win.once('ready-to-show', () => {
    win.show()
  })

  // Save window size/position on resize and move
  win.on('resize', () => {
    const [width, height] = win.getSize()
    const [wx, wy] = win.getPosition()
    savedState = { width, height, x: wx, y: wy }
  })

  win.on('move', () => {
    const [width, height] = win.getSize()
    const [wx, wy] = win.getPosition()
    savedState = { width, height, x: wx, y: wy }
  })

  // TODO: Persist savedState to disk via electron-store between sessions

  return win
}
