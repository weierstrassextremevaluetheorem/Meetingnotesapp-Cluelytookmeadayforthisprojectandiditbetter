import { app, globalShortcut, ipcMain } from 'electron'
import { join } from 'node:path'
// #region agent log
fetch('http://127.0.0.1:7242/ingest/43e14a31-7dfc-48c4-8100-ef5dd33935d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main/index.ts:TOP',message:'Main process starting - before dotenv import',data:{dirname:__dirname,nodeModulesExists:require('fs').existsSync(join(__dirname,'../node_modules')),nodeModulesExists2:require('fs').existsSync(join(__dirname,'../../node_modules')),resourcePath:process.resourcesPath||'N/A'},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
// #endregion

// Safely attempt dotenv import (wrapped for diagnosis)
let dotenvConfig: ((opts?: any) => void) | null = null
try {
  dotenvConfig = require('dotenv').config
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/43e14a31-7dfc-48c4-8100-ef5dd33935d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main/index.ts:DOTENV_OK',message:'dotenv loaded successfully',data:{},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
  // #endregion
} catch (err: any) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/43e14a31-7dfc-48c4-8100-ef5dd33935d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main/index.ts:DOTENV_FAIL',message:'dotenv require FAILED',data:{error:err.message,code:err.code,modulePaths:require('module')._nodeModulePaths(__dirname)},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
  // #endregion
}

import { createOverlayWindow, toggleOverlay, collapseOverlay, getOverlayWindow, isCollapsed } from './window'
import { createTray } from './tray'
import { registerIpcHandlers } from './ipc/handlers'
import { DatabaseInit } from './services/DatabaseInit'
import { SettingsStore } from './services/SettingsStore'
import { SessionStore } from './services/SessionStore'
import { AuditService } from './services/AuditService'
import { IPC } from './ipc/channels'

// #region agent log
fetch('http://127.0.0.1:7242/ingest/43e14a31-7dfc-48c4-8100-ef5dd33935d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main/index.ts:IMPORTS_DONE',message:'All imports completed',data:{wsAvailable:(() => { try { require('ws'); return true } catch { return false } })(),sqlJsAvailable:(() => { try { require('sql.js'); return true } catch { return false } })(),uuidAvailable:(() => { try { require('uuid'); return true } catch { return false } })()},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
// #endregion

// Load .env from project root (safely)
if (dotenvConfig) {
  dotenvConfig({ path: join(__dirname, '../../.env') })
} else {
  console.warn('[Main] dotenv not available - skipping .env loading (expected in production)')
}

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

  // Run data retention policy on startup
  try {
    const retentionDays = SettingsStore.get('retention_days')
    if (retentionDays) {
      const days = parseInt(retentionDays, 10)
      if (days > 0) {
        const purged = SessionStore.purgeOlderThan(days)
        if (purged > 0) {
          console.log(`[Main] Purged ${purged} session(s) older than ${days} days.`)
          AuditService.log('retention:purge', 'system', undefined, `Purged ${purged} sessions older than ${days} days`)
        }
      }
    }
  } catch (err) {
    console.error('[Main] Retention purge failed:', err)
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

  AuditService.log('app:start', 'system')
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
