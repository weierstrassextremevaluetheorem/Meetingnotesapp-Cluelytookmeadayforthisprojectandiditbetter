export interface PromptProfile {
  id: string
  name: string
  transcriptionPrompt: string
  notesPrompt: string
  outputFormat: string
  llmProviderOverride?: string | null
  llmModelOverride?: string | null
  llmEndpointOverride?: string | null
  createdAt: string
  updatedAt: string
}

export interface MeetingSession {
  id: string
  profileId: string
  profileName: string
  title?: string | null
  startedAt: string
  endedAt?: string
  transcriptText: string
  notesMarkdown?: string
  status: 'recording' | 'generating' | 'completed' | 'failed'
  feedbackRating?: number | null
  feedbackText?: string | null
}

export interface TranscriptDelta {
  itemId: string
  text: string
  timestamp: number
}

export interface TerminologyEntry {
  id: string
  term: string
  definition?: string | null
  createdAt: string
}

export interface AuditLogEntry {
  id: number
  timestamp: string
  action: string
  resource: string
  resourceId?: string
  details?: string
}

export type AppView = 'recording' | 'profiles' | 'history' | 'session-detail' | 'settings'

export interface RecordingState {
  isRecording: boolean
  isGenerating: boolean
  currentSessionId: string | null
  transcript: string
  notesMarkdown: string | null
  error: string | null
  selectedProfileId: string | null
}
