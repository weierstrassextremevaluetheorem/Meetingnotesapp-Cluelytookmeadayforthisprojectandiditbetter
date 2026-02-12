export interface PromptProfile {
  id: string
  name: string
  transcriptionPrompt: string
  notesPrompt: string
  outputFormat: string
  createdAt: string
  updatedAt: string
}

export interface MeetingSession {
  id: string
  profileId: string
  profileName: string
  startedAt: string
  endedAt?: string
  transcriptText: string
  notesMarkdown?: string
  status: 'recording' | 'generating' | 'completed' | 'failed'
}

export interface TranscriptDelta {
  itemId: string
  text: string
  timestamp: number
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
