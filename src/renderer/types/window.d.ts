import type { MeetingSession, PromptProfile, TranscriptDelta, TerminologyEntry } from './index'

export {}

export interface RecordingStartResult {
  success: boolean
  sessionId?: string
  error?: string
}

export interface RecordingStopResult {
  success: boolean
  sessionId?: string
  transcript?: string
  error?: string
}

export interface GenerateNotesResult {
  success: boolean
  notes?: string
  error?: string
}

export interface ExportSessionResult {
  success: boolean
  filePath?: string
  error?: string
}

export interface IntegrationResult {
  success: boolean
  error?: string
  url?: string
}

interface ElectronAPI {
  // Recording
  startRecording: (profileId: string) => Promise<RecordingStartResult>
  stopRecording: () => Promise<RecordingStopResult>
  generateNotes: (sessionId: string) => Promise<GenerateNotesResult>

  // Profiles
  listProfiles: () => Promise<PromptProfile[]>
  getProfile: (id: string) => Promise<PromptProfile | null>
  createProfile: (data: {
    name: string
    transcriptionPrompt: string
    notesPrompt: string
    outputFormat?: string
    llmProviderOverride?: string | null
    llmModelOverride?: string | null
    llmEndpointOverride?: string | null
  }) => Promise<unknown>
  updateProfile: (id: string, data: {
    name?: string
    transcriptionPrompt?: string
    notesPrompt?: string
    outputFormat?: string
    llmProviderOverride?: string | null
    llmModelOverride?: string | null
    llmEndpointOverride?: string | null
  }) => Promise<unknown>
  deleteProfile: (id: string) => Promise<boolean>

  // Sessions
  listSessions: () => Promise<MeetingSession[]>
  getSession: (id: string) => Promise<MeetingSession | null>
  searchSessions: (query: string) => Promise<MeetingSession[]>
  deleteSession: (id: string) => Promise<boolean>
  exportSessionMd: (id: string) => Promise<ExportSessionResult>

  // Session Feedback
  setSessionFeedback: (id: string, rating: number, text?: string) => Promise<boolean>

  // Settings
  getSettings: () => Promise<Record<string, string>>
  setSetting: (key: string, value: string) => Promise<boolean>
  getApiKeyMasked: () => Promise<string>

  // Terminology
  listTerminology: () => Promise<TerminologyEntry[]>
  addTerminology: (term: string, definition?: string) => Promise<TerminologyEntry | null>
  deleteTerminology: (id: string) => Promise<boolean>

  // Integrations
  exportToSlack: (sessionId: string) => Promise<IntegrationResult>
  exportToNotion: (sessionId: string) => Promise<IntegrationResult>

  // Window
  toggleWindow: () => void
  collapseWindow: () => void
  closeWindow: () => void
  isCollapsed: () => Promise<boolean>

  // Events (main -> renderer)
  onTranscriptDelta: (callback: (delta: TranscriptDelta) => void) => void
  onTranscriptCompleted: (callback: (data: TranscriptDelta) => void) => void
  onNotesReady: (callback: (markdown: string) => void) => void
  onRecordingStatus: (callback: (status: string) => void) => void
  onError: (callback: (message: string) => void) => void
  removeAllListeners: (channel: string) => void
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
