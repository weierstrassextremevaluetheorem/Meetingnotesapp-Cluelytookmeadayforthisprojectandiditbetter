import { ipcMain, dialog } from 'electron'
import { writeFileSync } from 'fs'
import { IPC } from './channels'
import { AudioBridgeService } from '../services/AudioBridgeService'
import { createTranscriptionService, type ITranscriptionService } from '../services/transcription'
import { NotesService } from '../services/NotesService'
import { ProfileStore } from '../services/ProfileStore'
import { SessionStore } from '../services/SessionStore'
import { SettingsStore } from '../services/SettingsStore'
import { getOverlayWindow } from '../window'

let audioBridge: AudioBridgeService | null = null
let transcription: ITranscriptionService | null = null
const notesService = new NotesService()

let currentSessionId: string | null = null
let accumulatedTranscript = ''

function sendToRenderer(channel: string, data: unknown): void {
  const win = getOverlayWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data)
  }
}

export function registerIpcHandlers(): void {
  // ── Recording ──────────────────────────────────────────────

  ipcMain.handle(IPC.RECORDING_START, async (_event, profileId: string) => {
    try {
      const profile = ProfileStore.get(profileId)
      if (!profile) {
        return { success: false, error: 'Profile not found' }
      }

      // Create session
      const session = SessionStore.create(profileId, profile.name)
      currentSessionId = session.id
      accumulatedTranscript = ''

      // Start audio bridge (sidecar)
      audioBridge = new AudioBridgeService()

      audioBridge.on('audio', (base64Pcm: string) => {
        transcription?.sendAudio(base64Pcm)
      })

      audioBridge.on('error', (msg: string) => {
        console.error('[IPC] Audio bridge error:', msg)
        sendToRenderer(IPC.APP_ERROR, msg)
      })

      audioBridge.on('status', (status: string) => {
        sendToRenderer(IPC.RECORDING_STATUS, status)
      })

      audioBridge.start()

      // Start transcription service
      transcription = createTranscriptionService()

      transcription.on('delta', (delta: { itemId: string; text: string; timestamp: number }) => {
        sendToRenderer(IPC.TRANSCRIPT_DELTA, delta)
      })

      transcription.on('completed', (data: { itemId: string; text: string; timestamp: number }) => {
        accumulatedTranscript += data.text + '\n'
        sendToRenderer(IPC.TRANSCRIPT_COMPLETED, data)
      })

      transcription.on('error', (msg: string) => {
        console.error('[IPC] Transcription error:', msg)
        sendToRenderer(IPC.APP_ERROR, msg)
      })

      await transcription.connect(profile.transcriptionPrompt)

      // Tell sidecar to start capturing
      audioBridge.sendStart()

      return { success: true, sessionId: session.id }
    } catch (err) {
      console.error('[IPC] Start recording error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC.RECORDING_STOP, async () => {
    try {
      // Stop sidecar audio capture
      if (audioBridge) {
        audioBridge.sendStop()
        // Give sidecar a moment to flush, then kill
        setTimeout(() => {
          audioBridge?.kill()
          audioBridge = null
        }, 1000)
      }

      // Disconnect transcription WebSocket
      if (transcription) {
        await transcription.disconnect()
        transcription = null
      }

      if (!currentSessionId) {
        return { success: false, error: 'No active session' }
      }

      // Save transcript
      SessionStore.updateTranscript(currentSessionId, accumulatedTranscript)

      return {
        success: true,
        sessionId: currentSessionId,
        transcript: accumulatedTranscript
      }
    } catch (err) {
      console.error('[IPC] Stop recording error:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Notes Generation ──────────────────────────────────────

  ipcMain.handle(IPC.NOTES_GENERATE, async (_event, sessionId: string) => {
    try {
      const session = SessionStore.get(sessionId)
      if (!session) return { success: false, error: 'Session not found' }

      const profile = ProfileStore.get(session.profileId)
      if (!profile) return { success: false, error: 'Profile not found' }

      SessionStore.setGenerating(sessionId)
      sendToRenderer(IPC.RECORDING_STATUS, 'generating')

      const notes = await notesService.generateNotes(
        session.transcriptText,
        profile.notesPrompt
      )

      SessionStore.complete(sessionId, notes)
      sendToRenderer(IPC.NOTES_READY, notes)
      sendToRenderer(IPC.RECORDING_STATUS, 'completed')

      return { success: true, notes }
    } catch (err) {
      console.error('[IPC] Notes generation error:', err)
      if (sessionId) SessionStore.fail(sessionId)
      sendToRenderer(IPC.APP_ERROR, `Notes generation failed: ${err}`)
      return { success: false, error: String(err) }
    }
  })

  // ── Profiles ──────────────────────────────────────────────

  ipcMain.handle(IPC.PROFILES_LIST, () => {
    return ProfileStore.list()
  })

  ipcMain.handle(IPC.PROFILES_GET, (_event, id: string) => {
    return ProfileStore.get(id)
  })

  ipcMain.handle(IPC.PROFILES_CREATE, (_event, data: {
    name: string
    transcriptionPrompt: string
    notesPrompt: string
    outputFormat?: string
  }) => {
    return ProfileStore.create(data)
  })

  ipcMain.handle(IPC.PROFILES_UPDATE, (_event, id: string, data: {
    name?: string
    transcriptionPrompt?: string
    notesPrompt?: string
    outputFormat?: string
  }) => {
    return ProfileStore.update(id, data)
  })

  ipcMain.handle(IPC.PROFILES_DELETE, (_event, id: string) => {
    return ProfileStore.delete(id)
  })

  // ── Sessions ──────────────────────────────────────────────

  ipcMain.handle(IPC.SESSIONS_LIST, () => {
    return SessionStore.list()
  })

  ipcMain.handle(IPC.SESSIONS_GET, (_event, id: string) => {
    return SessionStore.get(id)
  })

  ipcMain.handle(IPC.SESSIONS_DELETE, (_event, id: string) => {
    return SessionStore.delete(id)
  })

  ipcMain.handle(IPC.SESSIONS_EXPORT_MD, async (_event, id: string) => {
    const session = SessionStore.get(id)
    if (!session || !session.notesMarkdown) {
      return { success: false, error: 'No notes to export' }
    }

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save Meeting Notes',
      defaultPath: `meeting-notes-${session.startedAt.replace(/[:.]/g, '-')}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })

    if (canceled || !filePath) {
      return { success: false, error: 'Cancelled' }
    }

    writeFileSync(filePath, session.notesMarkdown, 'utf-8')
    return { success: true, filePath }
  })

  // ── Settings ──────────────────────────────────────────────

  ipcMain.handle(IPC.SETTINGS_GET_ALL, () => {
    return SettingsStore.getAll()
  })

  ipcMain.handle(IPC.SETTINGS_SET, (_event, key: string, value: string) => {
    SettingsStore.set(key, value)
    return true
  })

  ipcMain.handle(IPC.SETTINGS_GET_API_KEY, () => {
    const key = SettingsStore.getApiKey()
    return key ? `${key.slice(0, 7)}...${key.slice(-4)}` : ''
  })
}
