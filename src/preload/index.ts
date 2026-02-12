import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Recording
  startRecording: (profileId: string) => ipcRenderer.invoke('recording:start', profileId),
  stopRecording: () => ipcRenderer.invoke('recording:stop'),
  generateNotes: (sessionId: string) => ipcRenderer.invoke('notes:generate', sessionId),

  // Profiles
  listProfiles: () => ipcRenderer.invoke('profiles:list'),
  getProfile: (id: string) => ipcRenderer.invoke('profiles:get', id),
  createProfile: (data: {
    name: string; transcriptionPrompt: string; notesPrompt: string
    outputFormat?: string; llmProviderOverride?: string | null
    llmModelOverride?: string | null; llmEndpointOverride?: string | null
  }) => ipcRenderer.invoke('profiles:create', data),
  updateProfile: (id: string, data: {
    name?: string; transcriptionPrompt?: string; notesPrompt?: string
    outputFormat?: string; llmProviderOverride?: string | null
    llmModelOverride?: string | null; llmEndpointOverride?: string | null
  }) => ipcRenderer.invoke('profiles:update', id, data),
  deleteProfile: (id: string) => ipcRenderer.invoke('profiles:delete', id),

  // Sessions
  listSessions: () => ipcRenderer.invoke('sessions:list'),
  getSession: (id: string) => ipcRenderer.invoke('sessions:get', id),
  searchSessions: (query: string) => ipcRenderer.invoke('sessions:search', query),
  deleteSession: (id: string) => ipcRenderer.invoke('sessions:delete', id),
  exportSessionMd: (id: string) => ipcRenderer.invoke('sessions:exportMd', id),

  // Session Feedback
  setSessionFeedback: (id: string, rating: number, text?: string) =>
    ipcRenderer.invoke('sessions:feedback', id, rating, text),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
  getApiKeyMasked: () => ipcRenderer.invoke('settings:getApiKey'),

  // Terminology
  listTerminology: () => ipcRenderer.invoke('terminology:list'),
  addTerminology: (term: string, definition?: string) =>
    ipcRenderer.invoke('terminology:add', term, definition),
  deleteTerminology: (id: string) => ipcRenderer.invoke('terminology:delete', id),

  // Integrations
  exportToSlack: (sessionId: string) => ipcRenderer.invoke('integrations:slack:export', sessionId),
  exportToNotion: (sessionId: string) => ipcRenderer.invoke('integrations:notion:export', sessionId),

  // Window
  toggleWindow: () => ipcRenderer.send('window:toggle'),
  collapseWindow: () => ipcRenderer.send('window:collapse'),
  closeWindow: () => ipcRenderer.send('window:close'),
  isCollapsed: () => ipcRenderer.invoke('window:isCollapsed'),

  // Events (main -> renderer)
  onTranscriptDelta: (cb: (delta: { itemId: string; text: string; timestamp: number }) => void) =>
    ipcRenderer.on('transcript:delta', (_e, delta) => cb(delta)),
  onTranscriptCompleted: (cb: (data: { itemId: string; text: string; timestamp: number }) => void) =>
    ipcRenderer.on('transcript:completed', (_e, data) => cb(data)),
  onNotesReady: (cb: (markdown: string) => void) =>
    ipcRenderer.on('notes:ready', (_e, md) => cb(md)),
  onRecordingStatus: (cb: (status: string) => void) =>
    ipcRenderer.on('recording:status', (_e, status) => cb(status)),
  onError: (cb: (message: string) => void) =>
    ipcRenderer.on('app:error', (_e, msg) => cb(msg)),
  removeAllListeners: (channel: string) =>
    ipcRenderer.removeAllListeners(channel)
}

contextBridge.exposeInMainWorld('api', api)
