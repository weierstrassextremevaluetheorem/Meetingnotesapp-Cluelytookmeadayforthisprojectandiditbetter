import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let overlayWindow: BrowserWindow | null = null

const EXPANDED_WIDTH = 400
const EXPANDED_HEIGHT = 720
const COLLAPSED_WIDTH = 60
const COLLAPSED_HEIGHT = 60
const SCREEN_MARGIN = 12

export function createOverlayWindow(): BrowserWindow {
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize

  overlayWindow = new BrowserWindow({
    width: EXPANDED_WIDTH,
    height: EXPANDED_HEIGHT,
    x: screenW - EXPANDED_WIDTH - SCREEN_MARGIN,
    y: Math.floor(screenH * 0.06),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    focusable: true,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // Always on top at screen-saver level so it stays above fullscreen apps
  overlayWindow.setAlwaysOnTop(true, 'screen-saver')

  overlayWindow.once('ready-to-show', () => {
    overlayWindow?.show()
  })

  // Load the renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    overlayWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    overlayWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Prevent closing the window (just hide instead)
  overlayWindow.on('close', (e) => {
    e.preventDefault()
    overlayWindow?.hide()
  })

  return overlayWindow
}

export function getOverlayWindow(): BrowserWindow | null {
  return overlayWindow
}

export function toggleOverlay(): void {
  if (!overlayWindow) return
  if (overlayWindow.isVisible()) {
    overlayWindow.hide()
  } else {
    overlayWindow.show()
    overlayWindow.focus()
  }
}

export function collapseOverlay(): void {
  if (!overlayWindow) return
  const { width: screenW } = screen.getPrimaryDisplay().workAreaSize
  const currentBounds = overlayWindow.getBounds()
  const isCurrentlyCollapsed = currentBounds.width <= COLLAPSED_WIDTH + 10

  if (isCurrentlyCollapsed) {
    // Expand
    overlayWindow.setBounds({
      width: EXPANDED_WIDTH,
      height: EXPANDED_HEIGHT,
      x: screenW - EXPANDED_WIDTH - SCREEN_MARGIN,
      y: currentBounds.y
    })
  } else {
    // Collapse to pill
    overlayWindow.setBounds({
      width: COLLAPSED_WIDTH,
      height: COLLAPSED_HEIGHT,
      x: screenW - COLLAPSED_WIDTH - SCREEN_MARGIN,
      y: currentBounds.y + Math.floor(EXPANDED_HEIGHT / 2) - Math.floor(COLLAPSED_HEIGHT / 2)
    })
  }

  // Notify renderer about collapse state
  overlayWindow.webContents.send('window:collapsed', !isCurrentlyCollapsed)
}

export function isCollapsed(): boolean {
  if (!overlayWindow) return false
  return overlayWindow.getBounds().width <= COLLAPSED_WIDTH + 10
}
