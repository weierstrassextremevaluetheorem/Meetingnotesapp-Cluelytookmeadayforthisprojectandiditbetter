import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  // Recording
  startRecording: (profileId: string) => Promise<{ success: boolean; sessionId?: string; error?: string }>
  stopRecording: () => Promise<{ success: boolean; sessionId?: string; transcript?: string; error?: string }>
  generateNotes: (sessionId: string) => Promise<{ success: boolean; notes?: string; error?: string }>

  // Profiles
  listProfiles: () => Promise<Array<{
    id: string; name: string; transcriptionPrompt: string
    notesPrompt: string; outputFormat: string; createdAt: string; updatedAt: string
  }>>
  getProfile: (id: string) => Promise<{
    id: string; name: string; transcriptionPrompt: string
    notesPrompt: string; outputFormat: string; createdAt: string; updatedAt: string
  } | null>
  createProfile: (data: {
    name: string; transcriptionPrompt: string; notesPrompt: string; outputFormat?: string
  }) => Promise<unknown>
  updateProfile: (id: string, data: {
    name?: string; transcriptionPrompt?: string; notesPrompt?: string; outputFormat?: string
  }) => Promise<unknown>
  deleteProfile: (id: string) => Promise<boolean>

  // Sessions
  listSessions: () => Promise<Array<{
    id: string; profileId: string; profileName: string; startedAt: string
    endedAt?: string; transcriptText: string; notesMarkdown?: string; status: string
  }>>
  getSession: (id: string) => Promise<{
    id: string; profileId: string; profileName: string; startedAt: string
    endedAt?: string; transcriptText: string; notesMarkdown?: string; status: string
  } | null>
  deleteSession: (id: string) => Promise<boolean>

  // Settings
  getSettings: () => Promise<Record<string, string>>
  setSetting: (key: string, value: string) => Promise<boolean>
  getApiKeyMasked: () => Promise<string>
  exportSessionMd: (id: string) => Promise<{ success: boolean; filePath?: string; error?: string }>

  // Window
  toggleWindow: () => void
  collapseWindow: () => void
  closeWindow: () => void
  isCollapsed: () => Promise<boolean>

  // Events (main -> renderer)
  onTranscriptDelta: (callback: (delta: { itemId: string; text: string; timestamp: number }) => void) => void
  onTranscriptCompleted: (callback: (data: { itemId: string; text: string; timestamp: number }) => void) => void
  onNotesReady: (callback: (markdown: string) => void) => void
  onRecordingStatus: (callback: (status: string) => void) => void
  onError: (callback: (message: string) => void) => void
  removeAllListeners: (channel: string) => void
}

const api: ElectronAPI = {
  // Recording
  startRecording: (profileId) => ipcRenderer.invoke('recording:start', profileId),
  stopRecording: () => ipcRenderer.invoke('recording:stop'),
  generateNotes: (sessionId) => ipcRenderer.invoke('notes:generate', sessionId),

  // Profiles
  listProfiles: () => ipcRenderer.invoke('profiles:list'),
  getProfile: (id) => ipcRenderer.invoke('profiles:get', id),
  createProfile: (data) => ipcRenderer.invoke('profiles:create', data),
  updateProfile: (id, data) => ipcRenderer.invoke('profiles:update', id, data),
  deleteProfile: (id) => ipcRenderer.invoke('profiles:delete', id),

  // Sessions
  listSessions: () => ipcRenderer.invoke('sessions:list'),
  getSession: (id) => ipcRenderer.invoke('sessions:get', id),
  deleteSession: (id) => ipcRenderer.invoke('sessions:delete', id),
  exportSessionMd: (id) => ipcRenderer.invoke('sessions:exportMd', id),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  getApiKeyMasked: () => ipcRenderer.invoke('settings:getApiKey'),

  // Window
  toggleWindow: () => ipcRenderer.send('window:toggle'),
  collapseWindow: () => ipcRenderer.send('window:collapse'),
  closeWindow: () => ipcRenderer.send('window:close'),
  isCollapsed: () => ipcRenderer.invoke('window:isCollapsed'),

  // Events
  onTranscriptDelta: (cb) => ipcRenderer.on('transcript:delta', (_e, delta) => cb(delta)),
  onTranscriptCompleted: (cb) => ipcRenderer.on('transcript:completed', (_e, data) => cb(data)),
  onNotesReady: (cb) => ipcRenderer.on('notes:ready', (_e, md) => cb(md)),
  onRecordingStatus: (cb) => ipcRenderer.on('recording:status', (_e, status) => cb(status)),
  onError: (cb) => ipcRenderer.on('app:error', (_e, msg) => cb(msg)),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
}

contextBridge.exposeInMainWorld('api', api)
