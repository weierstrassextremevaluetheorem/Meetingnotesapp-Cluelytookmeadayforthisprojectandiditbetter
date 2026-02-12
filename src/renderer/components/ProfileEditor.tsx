import { useState } from 'react'
import { useProfiles } from '../hooks/useProfiles'
import { useAppStore } from '../stores/appStore'
import type { PromptProfile } from '../types'

export function ProfileEditor() {
  const { profiles, createProfile, updateProfile, deleteProfile } = useProfiles()
  const setView = useAppStore((s) => s.setView)
  const [editingProfile, setEditingProfile] = useState<PromptProfile | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const [name, setName] = useState('')
  const [transcriptionPrompt, setTranscriptionPrompt] = useState('')
  const [notesPrompt, setNotesPrompt] = useState('')

  const startEdit = (profile: PromptProfile) => {
    setEditingProfile(profile)
    setIsCreating(false)
    setName(profile.name)
    setTranscriptionPrompt(profile.transcriptionPrompt)
    setNotesPrompt(profile.notesPrompt)
  }

  const startCreate = () => {
    setEditingProfile(null)
    setIsCreating(true)
    setName('')
    setTranscriptionPrompt('')
    setNotesPrompt('')
  }

  const handleSave = async () => {
    if (!name.trim() || !notesPrompt.trim()) return

    if (isCreating) {
      await createProfile({ name, transcriptionPrompt, notesPrompt })
    } else if (editingProfile) {
      await updateProfile(editingProfile.id, { name, transcriptionPrompt, notesPrompt })
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
              <span className="text-xs text-white/80 font-medium">{p.name}</span>
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
        <div className="border-t border-white/5 px-3 py-2 space-y-2 bg-white/2">
          <span className="text-[11px] font-medium text-white/60">
            {isCreating ? 'New Profile' : 'Edit Profile'}
          </span>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Profile name"
            className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1
                       text-xs text-white/80 outline-none focus:border-white/20
                       placeholder:text-white/20"
          />

          <div>
            <label className="text-[10px] text-white/40 mb-0.5 block">
              Transcription Prompt (keywords/names)
            </label>
            <input
              value={transcriptionPrompt}
              onChange={(e) => setTranscriptionPrompt(e.target.value)}
              placeholder="Optional keyword hints..."
              className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1
                         text-xs text-white/80 outline-none focus:border-white/20
                         placeholder:text-white/20"
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
              className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1
                         text-xs text-white/80 outline-none focus:border-white/20
                         placeholder:text-white/20 resize-none"
            />
          </div>

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
