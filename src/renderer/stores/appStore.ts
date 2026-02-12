import { create } from 'zustand'
import type { AppView, PromptProfile, MeetingSession } from '../types'

interface AppState {
  // View
  currentView: AppView
  setView: (view: AppView) => void

  // Overlay
  isCollapsed: boolean
  setCollapsed: (collapsed: boolean) => void

  // Recording
  isRecording: boolean
  isGenerating: boolean
  currentSessionId: string | null
  selectedProfileId: string | null
  transcript: string
  notesMarkdown: string | null
  error: string | null

  setRecording: (recording: boolean) => void
  setGenerating: (generating: boolean) => void
  setCurrentSessionId: (id: string | null) => void
  setSelectedProfileId: (id: string | null) => void
  appendTranscript: (text: string) => void
  setTranscript: (text: string) => void
  setNotesMarkdown: (md: string | null) => void
  setError: (error: string | null) => void
  resetRecording: () => void

  // Profiles
  profiles: PromptProfile[]
  setProfiles: (profiles: PromptProfile[]) => void

  // Sessions
  sessions: MeetingSession[]
  setSessions: (sessions: MeetingSession[]) => void
  selectedSessionId: string | null
  setSelectedSessionId: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  // View
  currentView: 'recording',
  setView: (view) => set({ currentView: view }),

  // Overlay
  isCollapsed: false,
  setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),

  // Recording
  isRecording: false,
  isGenerating: false,
  currentSessionId: null,
  selectedProfileId: null,
  transcript: '',
  notesMarkdown: null,
  error: null,

  setRecording: (recording) => set({ isRecording: recording }),
  setGenerating: (generating) => set({ isGenerating: generating }),
  setCurrentSessionId: (id) => set({ currentSessionId: id }),
  setSelectedProfileId: (id) => set({ selectedProfileId: id }),
  appendTranscript: (text) => set((state) => ({ transcript: state.transcript + text })),
  setTranscript: (text) => set({ transcript: text }),
  setNotesMarkdown: (md) => set({ notesMarkdown: md }),
  setError: (error) => set({ error }),
  resetRecording: () => set({
    isRecording: false,
    isGenerating: false,
    currentSessionId: null,
    transcript: '',
    notesMarkdown: null,
    error: null
  }),

  // Profiles
  profiles: [],
  setProfiles: (profiles) => set({ profiles }),

  // Sessions
  sessions: [],
  setSessions: (sessions) => set({ sessions }),
  selectedSessionId: null,
  setSelectedSessionId: (id) => set({ selectedSessionId: id })
}))
