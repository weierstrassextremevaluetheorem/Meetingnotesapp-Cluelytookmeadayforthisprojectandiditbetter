import { Tray, Menu, nativeImage, app } from 'electron'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { toggleOverlay, getOverlayWindow } from './window'
import { ProfileStore } from './services/ProfileStore'
import { getRecordingState, startRecordingFromProfile, stopCurrentRecording } from './ipc/handlers'
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

  const { isRecording } = getRecordingState()
  const profiles = ProfileStore.list()

  const profileSubmenu: Electron.MenuItemConstructorOptions[] = profiles.map((p) => ({
    label: p.name,
    click: async () => {
      if (!isRecording) {
        await startRecordingFromProfile(p.id)
        updateTrayMenu()
        // Show overlay so user can see the recording
        const win = getOverlayWindow()
        if (win && !win.isVisible()) {
          win.show()
          win.focus()
        }
      }
    }
  }))

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Show / Hide',
      click: () => toggleOverlay()
    },
    { type: 'separator' },
    ...(isRecording
      ? [
          {
            label: 'Stop Recording',
            click: async () => {
              await stopCurrentRecording()
              updateTrayMenu()
            }
          } as Electron.MenuItemConstructorOptions
        ]
      : [
          {
            label: 'Start Recording',
            submenu: profileSubmenu.length > 0
              ? profileSubmenu
              : [{ label: 'No profiles available', enabled: false }]
          } as Electron.MenuItemConstructorOptions
        ]),
    { type: 'separator' },
    {
      label: 'Quit Meeting Assistant',
      click: () => {
        const win = getOverlayWindow()
        if (win) win.destroy()
        app.quit()
      }
    }
  ]

  const contextMenu = Menu.buildFromTemplate(template)
  tray.setContextMenu(contextMenu)
}

function createFallbackIcon(): Electron.NativeImage {
  // Create a simple 16x16 colored icon as fallback
  const size = 16
  const channels = 4 // RGBA
  const buf = Buffer.alloc(size * size * channels)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * channels
      const cx = x - size / 2
      const cy = y - size / 2
      const dist = Math.sqrt(cx * cx + cy * cy)

      if (dist < size / 2 - 1) {
        buf[i] = 74      // R
        buf[i + 1] = 222  // G
        buf[i + 2] = 128  // B
        buf[i + 3] = 255  // A
      } else {
        buf[i + 3] = 0    // transparent
      }
    }
  }

  return nativeImage.createFromBuffer(buf, { width: size, height: size })
}
