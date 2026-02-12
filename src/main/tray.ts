import { Tray, Menu, nativeImage, app } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { toggleOverlay, getOverlayWindow } from './window'
import { is } from '@electron-toolkit/utils'

let tray: Tray | null = null

export function createTray(): Tray {
  const iconPath = is.dev
    ? join(__dirname, '../../resources/icon.ico')
    : join(process.resourcesPath, 'icon.ico')

  let icon: Electron.NativeImage

  if (existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath)
    if (icon.isEmpty()) {
      icon = createFallbackIcon()
    }
  } else {
    console.warn('[Tray] Icon not found at', iconPath, '- using fallback')
    icon = createFallbackIcon()
  }

  // Resize for tray (16x16)
  const resized = icon.resize({ width: 16, height: 16 })
  tray = new Tray(resized)

  updateTrayMenu()

  tray.setToolTip('Meeting Assistant')
  tray.on('click', () => toggleOverlay())

  return tray
}

export function updateTrayMenu(): void {
  if (!tray) return

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show / Hide',
      click: () => toggleOverlay()
    },
    { type: 'separator' },
    {
      label: 'Quit Meeting Assistant',
      click: () => {
        const win = getOverlayWindow()
        if (win) win.destroy()
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
}

function createFallbackIcon(): Electron.NativeImage {
  // Create a 16x16 green circle as fallback
  // This is a minimal valid 16x16 RGBA raw buffer
  const size = 16
  const buf = Buffer.alloc(size * size * 4)
  const cx = size / 2, cy = size / 2, r = 6

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const dx = x - cx, dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= r) {
        buf[idx] = 80     // R
        buf[idx + 1] = 200 // G
        buf[idx + 2] = 120 // B
        buf[idx + 3] = 255 // A
      }
    }
  }

  return nativeImage.createFromBuffer(buf, { width: size, height: size })
}
