import { useState } from 'react'
import { useProfiles } from '../hooks/useProfiles'
import { useAppStore } from '../stores/appStore'
import type { PromptProfile } from '../types'

const LLM_PROVIDERS = [
  { id: '', label: 'Use global default' },
  { id: 'openai-compatible', label: 'OpenAI-Compatible' },
  { id: 'anthropic', label: 'Anthropic Claude' }
]

export function ProfileEditor() {
  const { profiles, createProfile, updateProfile, deleteProfile } = useProfiles()
  const setView = useAppStore((s) => s.setView)
  const [editingProfile, setEditingProfile] = useState<PromptProfile | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const [name, setName] = useState('')
  const [transcriptionPrompt, setTranscriptionPrompt] = useState('')
  const [notesPrompt, setNotesPrompt] = useState('')
  const [llmProviderOverride, setLlmProviderOverride] = useState('')
  const [llmModelOverride, setLlmModelOverride] = useState('')
  const [llmEndpointOverride, setLlmEndpointOverride] = useState('')

  const startEdit = (profile: PromptProfile) => {
    setEditingProfile(profile)
    setIsCreating(false)
    setName(profile.name)
    setTranscriptionPrompt(profile.transcriptionPrompt)
    setNotesPrompt(profile.notesPrompt)
    setLlmProviderOverride(profile.llmProviderOverride || '')
    setLlmModelOverride(profile.llmModelOverride || '')
    setLlmEndpointOverride(profile.llmEndpointOverride || '')
  }

  const startCreate = () => {
    setEditingProfile(null)
    setIsCreating(true)
    setName('')
    setTranscriptionPrompt('')
    setNotesPrompt('')
    setLlmProviderOverride('')
    setLlmModelOverride('')
    setLlmEndpointOverride('')
  }

  const handleSave = async () => {
    if (!name.trim() || !notesPrompt.trim()) return

    const data = {
      name,
      transcriptionPrompt,
      notesPrompt,
      llmProviderOverride: llmProviderOverride || null,
      llmModelOverride: llmModelOverride || null,
      llmEndpointOverride: llmEndpointOverride || null
    }

    if (isCreating) {
      await createProfile(data)
    } else if (editingProfile) {
      await updateProfile(editingProfile.id, data)
    }

    setEditingProfile(null)
    setIsCreating(false)
  }

  const handleDelete = async (id: string) => {
    await deleteProfile(id)
    if (editingProfile?.id === id) {
      setEditingProfile(null)
    }
  }

  const handleCancel = () => {
    setEditingProfile(null)
    setIsCreating(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <span className="text-xs font-medium text-white/70">Prompt Profiles</span>
        <button
          onClick={startCreate}
          className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400
                     hover:bg-emerald-500/30 transition-colors border border-emerald-500/20"
        >
          + New
        </button>
      </div>

      {/* Profile list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {profiles.map((p) => (
          <div
            key={p.id}
            onClick={() => startEdit(p)}
            className={`px-3 py-2 border-b border-white/3 cursor-pointer hover:bg-white/3 transition-colors
              ${editingProfile?.id === p.id ? 'bg-white/5' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/80 font-medium">{p.name}</span>
                {p.llmModelOverride && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-400/60">
                    {p.llmModelOverride}
                  </span>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }}
                className="text-[10px] text-red-400/50 hover:text-red-400 transition-colors"
              >
                Delete
              </button>
            </div>
            <p className="text-[10px] text-white/30 truncate mt-0.5">
              {p.notesPrompt.slice(0, 80)}...
            </p>
          </div>
        ))}
      </div>

      {/* Edit form */}
      {(isCreating || editingProfile) && (
        <div className="border-t border-white/5 px-3 py-2 space-y-2 bg-white/2 max-h-[50%] overflow-y-auto">
          <span className="text-[11px] font-medium text-white/60">
            {isCreating ? 'New Profile' : 'Edit Profile'}
          </span>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Profile name"
            className="input-field"
          />

          <div>
            <label className="text-[10px] text-white/40 mb-0.5 block">
              Transcription Prompt (keywords/names)
            </label>
            <input
              value={transcriptionPrompt}
              onChange={(e) => setTranscriptionPrompt(e.target.value)}
              placeholder="Optional keyword hints..."
              className="input-field"
            />
          </div>

          <div>
            <label className="text-[10px] text-white/40 mb-0.5 block">
              Notes Prompt (system instructions)
            </label>
            <textarea
              value={notesPrompt}
              onChange={(e) => setNotesPrompt(e.target.value)}
              placeholder="Instructions for generating meeting notes..."
              rows={4}
              className="input-field resize-none"
            />
          </div>

          {/* Per-profile LLM overrides */}
          <details className="group">
            <summary className="text-[10px] text-white/40 cursor-pointer hover:text-white/60 transition-colors select-none">
              LLM Override (optional)
            </summary>
            <div className="mt-1.5 space-y-1.5 pl-1">
              <div>
                <label className="text-[9px] text-white/30 block">Provider</label>
                <select
                  value={llmProviderOverride}
                  onChange={(e) => setLlmProviderOverride(e.target.value)}
                  className="input-field appearance-none"
                >
                  {LLM_PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id} className="bg-gray-900">{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-white/30 block">Model</label>
                <input
                  value={llmModelOverride}
                  onChange={(e) => setLlmModelOverride(e.target.value)}
                  placeholder="Leave blank for global default"
                  className="input-field font-mono"
                />
              </div>
              <div>
                <label className="text-[9px] text-white/30 block">Endpoint</label>
                <input
                  value={llmEndpointOverride}
                  onChange={(e) => setLlmEndpointOverride(e.target.value)}
                  placeholder="Leave blank for global default"
                  className="input-field font-mono"
                />
              </div>
            </div>
          </details>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!name.trim() || !notesPrompt.trim()}
              className="flex-1 py-1.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs
                         hover:bg-emerald-500/30 transition-colors border border-emerald-500/20
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 rounded-md bg-white/5 text-white/50 text-xs
                         hover:bg-white/10 transition-colors border border-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
