import { app, globalShortcut, ipcMain } from 'electron'
import { join } from 'node:path'
import { config } from 'dotenv'
import { createOverlayWindow, toggleOverlay, collapseOverlay, getOverlayWindow, isCollapsed } from './window'
import { createTray } from './tray'
import { registerIpcHandlers } from './ipc/handlers'
import { DatabaseInit } from './services/DatabaseInit'
import { IPC } from './ipc/channels'

// Load .env from project root
config({ path: join(__dirname, '../../.env') })

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

app.on('second-instance', () => {
  const win = getOverlayWindow()
  if (win) {
    if (!win.isVisible()) win.show()
    win.focus()
  }
})

app.whenReady().then(async () => {
  // Initialize database (async for sql.js WASM init)
  try {
    await DatabaseInit.initialize()
    console.log('[Main] Database initialized.')
  } catch (err) {
    console.error('[Main] Database init failed:', err)
  }

  // Create overlay window
  createOverlayWindow()

  // Create system tray
  createTray()

  // Register IPC handlers
  registerIpcHandlers()

  // Global shortcut: Ctrl+Shift+M to toggle overlay
  globalShortcut.register('CommandOrControl+Shift+M', () => {
    toggleOverlay()
  })

  // Window control IPC
  ipcMain.on(IPC.WINDOW_TOGGLE, () => toggleOverlay())
  ipcMain.on(IPC.WINDOW_COLLAPSE, () => collapseOverlay())
  ipcMain.on(IPC.WINDOW_CLOSE, () => {
    const win = getOverlayWindow()
    if (win) win.hide()
  })

  // Query collapsed state
  ipcMain.handle('window:isCollapsed', () => isCollapsed())

  console.log('[Main] Meeting Assistant ready.')
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

// Keep app running when all windows are closed (system tray)
app.on('window-all-closed', () => {
  // Keep process alive for tray-only mode.
})

// Global error handling
process.on('uncaughtException', (err) => {
  console.error('[Main] Uncaught exception:', err)
})

process.on('unhandledRejection', (reason) => {
  console.error('[Main] Unhandled rejection:', reason)
})
