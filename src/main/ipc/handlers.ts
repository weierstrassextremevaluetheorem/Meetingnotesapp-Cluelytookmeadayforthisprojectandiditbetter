import { ipcMain, dialog } from 'electron'
import { writeFileSync } from 'node:fs'
import { IPC } from './channels'
import { AudioBridgeService } from '../services/AudioBridgeService'
import { createTranscriptionService, type ITranscriptionService } from '../services/transcription'
import { NotesService } from '../services/NotesService'
import { ProfileStore } from '../services/ProfileStore'
import { SessionStore } from '../services/SessionStore'
import { SettingsStore } from '../services/SettingsStore'
import { AuditService } from '../services/AuditService'
import { TerminologyStore } from '../services/TerminologyStore'
import { IntegrationService } from '../services/IntegrationService'
import { getOverlayWindow } from '../window'

let audioBridge: AudioBridgeService | null = null
let transcription: ITranscriptionService | null = null
const notesService = new NotesService()

let currentSessionId: string | null = null
let accumulatedTranscript = ''

// ── Settings key allowlist (security hardening) ──────────────

const ALLOWED_SETTINGS_KEYS = new Set([
  'transcription_provider',
  'transcription_model',
  'llm_provider',
  'llm_model',
  'llm_endpoint',
  'openai_api_key',
  'deepgram_api_key',
  'deepgram_model',
  'anthropic_api_key',
  'llm_api_key',
  'slack_webhook_url',
  'notion_api_key',
  'notion_database_id',
  'retention_days'
])

function sendToRenderer(channel: string, data: unknown): void {
  const win = getOverlayWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data)
  }
}

export function getRecordingState(): { isRecording: boolean; profileId: string | null } {
  return {
    isRecording: audioBridge !== null && currentSessionId !== null,
    profileId: currentSessionId ? SessionStore.get(currentSessionId)?.profileId || null : null
  }
}

export async function startRecordingFromProfile(profileId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = ProfileStore.get(profileId)
    if (!profile) return { success: false, error: 'Profile not found' }

    const session = SessionStore.create(profileId, profile.name)
    currentSessionId = session.id
    accumulatedTranscript = ''

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

    // Inject terminology hints into the transcription prompt
    const terminologyHints = TerminologyStore.getKeywordHints()
    let transcriptionPrompt = profile.transcriptionPrompt || ''
    if (terminologyHints) {
      transcriptionPrompt = transcriptionPrompt
        ? `${transcriptionPrompt}, ${terminologyHints}`
        : terminologyHints
    }

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

    await transcription.connect(transcriptionPrompt)
    audioBridge.sendStart()

    AuditService.log('recording:start', 'session', session.id, `Profile: ${profile.name}`)
    return { success: true }
  } catch (err) {
    console.error('[IPC] Start recording error:', err)
    return { success: false, error: String(err) }
  }
}

export async function stopCurrentRecording(): Promise<{ success: boolean; sessionId?: string; transcript?: string; error?: string }> {
  try {
    if (audioBridge) {
      audioBridge.sendStop()
      setTimeout(() => { audioBridge?.kill(); audioBridge = null }, 1000)
    }
    if (transcription) {
      await transcription.disconnect()
      transcription = null
    }
    if (!currentSessionId) {
      return { success: false, error: 'No active session' }
    }

    // Capture values before clearing state
    const sessionId = currentSessionId
    const transcript = accumulatedTranscript

    // Clear recording state so getRecordingState() reports correctly
    // and repeated calls don't write stale data
    currentSessionId = null
    accumulatedTranscript = ''

    SessionStore.updateTranscript(sessionId, transcript)
    AuditService.log('recording:stop', 'session', sessionId)

    return { success: true, sessionId, transcript }
  } catch (err) {
    console.error('[IPC] Stop recording error:', err)
    return { success: false, error: String(err) }
  }
}

export function registerIpcHandlers(): void {
  // ── Recording ──────────────────────────────────────────────

  ipcMain.handle(IPC.RECORDING_START, async (_event, profileId: string) => {
    if (!profileId || typeof profileId !== 'string') {
      return { success: false, error: 'Invalid profile ID' }
    }
    const result = await startRecordingFromProfile(profileId)
    if (result.success) {
      return { success: true, sessionId: currentSessionId }
    }
    return result
  })

  ipcMain.handle(IPC.RECORDING_STOP, async () => {
    return stopCurrentRecording()
  })

  // ── Notes Generation ──────────────────────────────────────

  ipcMain.handle(IPC.NOTES_GENERATE, async (_event, sessionId: string) => {
    if (!sessionId || typeof sessionId !== 'string') {
      return { success: false, error: 'Invalid session ID' }
    }
    try {
      const session = SessionStore.get(sessionId)
      if (!session) return { success: false, error: 'Session not found' }

      const profile = ProfileStore.get(session.profileId)
      if (!profile) return { success: false, error: 'Profile not found' }

      SessionStore.setGenerating(sessionId)
      sendToRenderer(IPC.RECORDING_STATUS, 'generating')

      const notes = await notesService.generateNotes(
        session.transcriptText,
        profile.notesPrompt,
        {
          providerOverride: profile.llmProviderOverride,
          modelOverride: profile.llmModelOverride,
          endpointOverride: profile.llmEndpointOverride
        }
      )

      SessionStore.complete(sessionId, notes)
      sendToRenderer(IPC.NOTES_READY, notes)
      sendToRenderer(IPC.RECORDING_STATUS, 'completed')

      AuditService.log('notes:generate', 'session', sessionId)
      return { success: true, notes }
    } catch (err) {
      console.error('[IPC] Notes generation error:', err)
      if (sessionId) SessionStore.fail(sessionId)
      sendToRenderer(IPC.APP_ERROR, `Notes generation failed: ${err}`)
      return { success: false, error: String(err) }
    }
  })

  // ── Profiles ──────────────────────────────────────────────

  ipcMain.handle(IPC.PROFILES_LIST, () => ProfileStore.list())

  ipcMain.handle(IPC.PROFILES_GET, (_event, id: string) => {
    if (!id || typeof id !== 'string') return null
    return ProfileStore.get(id)
  })

  ipcMain.handle(IPC.PROFILES_CREATE, (_event, data: {
    name: string
    transcriptionPrompt: string
    notesPrompt: string
    outputFormat?: string
    llmProviderOverride?: string | null
    llmModelOverride?: string | null
    llmEndpointOverride?: string | null
  }) => {
    if (!data?.name?.trim() || !data?.notesPrompt?.trim()) {
      return null
    }
    const result = ProfileStore.create(data)
    AuditService.log('profile:create', 'profile', result.id, result.name)
    return result
  })

  ipcMain.handle(IPC.PROFILES_UPDATE, (_event, id: string, data: {
    name?: string
    transcriptionPrompt?: string
    notesPrompt?: string
    outputFormat?: string
    llmProviderOverride?: string | null
    llmModelOverride?: string | null
    llmEndpointOverride?: string | null
  }) => {
    if (!id || typeof id !== 'string') return null
    const result = ProfileStore.update(id, data)
    if (result) AuditService.log('profile:update', 'profile', id, result.name)
    return result
  })

  ipcMain.handle(IPC.PROFILES_DELETE, (_event, id: string) => {
    if (!id || typeof id !== 'string') return false
    AuditService.log('profile:delete', 'profile', id)
    return ProfileStore.delete(id)
  })

  // ── Sessions ──────────────────────────────────────────────

  ipcMain.handle(IPC.SESSIONS_LIST, () => SessionStore.list())

  ipcMain.handle(IPC.SESSIONS_GET, (_event, id: string) => {
    if (!id || typeof id !== 'string') return null
    return SessionStore.get(id)
  })

  ipcMain.handle(IPC.SESSIONS_SEARCH, (_event, query: string) => {
    if (!query || typeof query !== 'string') return SessionStore.list()
    return SessionStore.search(query)
  })

  ipcMain.handle(IPC.SESSIONS_DELETE, (_event, id: string) => {
    if (!id || typeof id !== 'string') return false
    AuditService.log('session:delete', 'session', id)
    return SessionStore.delete(id)
  })

  ipcMain.handle(IPC.SESSIONS_EXPORT_MD, async (_event, id: string) => {
    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Invalid session ID' }
    }
    const session = SessionStore.get(id)
    if (!session || !session.notesMarkdown) {
      return { success: false, error: 'No notes to export' }
    }

    const dateSlug = session.startedAt.replace(/[:.]/g, '-')
    const titleSlug = session.title ? `-${session.title.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 40)}` : ''

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save Meeting Notes',
      defaultPath: `meeting-notes${titleSlug}-${dateSlug}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })

    if (canceled || !filePath) {
      return { success: false, error: 'Cancelled' }
    }

    writeFileSync(filePath, session.notesMarkdown, 'utf-8')
    AuditService.log('session:export', 'session', id, `Format: md`)
    return { success: true, filePath }
  })

  // ── Session Feedback ──────────────────────────────────────

  ipcMain.handle(IPC.SESSION_FEEDBACK, (_event, id: string, rating: number, text?: string) => {
    if (!id || typeof id !== 'string') return false
    if (typeof rating !== 'number' || rating < -1 || rating > 1) return false
    SessionStore.setFeedback(id, rating, text)
    AuditService.log('session:feedback', 'session', id, `Rating: ${rating}`)
    return true
  })

  // ── Settings (with allowlist) ─────────────────────────────

  ipcMain.handle(IPC.SETTINGS_GET_ALL, () => SettingsStore.getAll())

  ipcMain.handle(IPC.SETTINGS_SET, (_event, key: string, value: string) => {
    if (!key || typeof key !== 'string' || typeof value !== 'string') return false
    if (!ALLOWED_SETTINGS_KEYS.has(key)) {
      console.warn(`[IPC] Rejected settings key: ${key}`)
      return false
    }
    SettingsStore.set(key, value)
    AuditService.log('settings:set', 'setting', key)
    return true
  })

  ipcMain.handle(IPC.SETTINGS_GET_API_KEY, () => {
    const key = SettingsStore.getApiKey()
    return key ? `${key.slice(0, 7)}...${key.slice(-4)}` : ''
  })

  // ── Terminology ───────────────────────────────────────────

  ipcMain.handle(IPC.TERMINOLOGY_LIST, () => TerminologyStore.list())

  ipcMain.handle(IPC.TERMINOLOGY_ADD, (_event, term: string, definition?: string) => {
    if (!term || typeof term !== 'string' || !term.trim()) return null
    return TerminologyStore.add(term, definition)
  })

  ipcMain.handle(IPC.TERMINOLOGY_DELETE, (_event, id: string) => {
    if (!id || typeof id !== 'string') return false
    return TerminologyStore.delete(id)
  })

  // ── Integrations ──────────────────────────────────────────

  ipcMain.handle(IPC.SLACK_EXPORT, async (_event, sessionId: string) => {
    if (!sessionId || typeof sessionId !== 'string') {
      return { success: false, error: 'Invalid session ID' }
    }
    const session = SessionStore.get(sessionId)
    if (!session || !session.notesMarkdown) {
      return { success: false, error: 'No notes to export' }
    }

    const title = session.title || `${session.profileName} - ${new Date(session.startedAt).toLocaleDateString()}`
    const result = await IntegrationService.exportToSlack(title, session.notesMarkdown, session.transcriptText)

    if (result.success) {
      AuditService.log('integration:slack', 'session', sessionId)
    }
    return result
  })

  ipcMain.handle(IPC.NOTION_EXPORT, async (_event, sessionId: string) => {
    if (!sessionId || typeof sessionId !== 'string') {
      return { success: false, error: 'Invalid session ID' }
    }
    const session = SessionStore.get(sessionId)
    if (!session || !session.notesMarkdown) {
      return { success: false, error: 'No notes to export' }
    }

    const title = session.title || `${session.profileName} - ${new Date(session.startedAt).toLocaleDateString()}`
    const result = await IntegrationService.exportToNotion(title, session.notesMarkdown, session.startedAt)

    if (result.success) {
      AuditService.log('integration:notion', 'session', sessionId)
    }
    return result
  })

  // ── Audit ─────────────────────────────────────────────────

  ipcMain.handle(IPC.AUDIT_LOG, () => AuditService.list())
}
