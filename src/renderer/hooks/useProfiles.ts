import { useCallback, useEffect } from 'react'
import { useAppStore } from '../stores/appStore'
import type { PromptProfile } from '../types'

export function useProfiles() {
  const profiles = useAppStore((s) => s.profiles)
  const setProfiles = useAppStore((s) => s.setProfiles)
  const selectedProfileId = useAppStore((s) => s.selectedProfileId)
  const setSelectedProfileId = useAppStore((s) => s.setSelectedProfileId)

  const loadProfiles = useCallback(async () => {
    if (!window.api) return
    try {
      const list = await window.api.listProfiles()
      setProfiles(list as PromptProfile[])
      // Auto-select first profile if none selected
      if (!selectedProfileId && list.length > 0) {
        setSelectedProfileId(list[0].id)
      }
    } catch (err) {
      console.error('Failed to load profiles:', err)
    }
  }, [setProfiles, selectedProfileId, setSelectedProfileId])

  const createProfile = useCallback(async (data: {
    name: string
    transcriptionPrompt: string
    notesPrompt: string
    llmProviderOverride?: string | null
    llmModelOverride?: string | null
    llmEndpointOverride?: string | null
  }) => {
    await window.api.createProfile(data)
    await loadProfiles()
  }, [loadProfiles])

  const updateProfile = useCallback(async (id: string, data: Partial<PromptProfile>) => {
    await window.api.updateProfile(id, data)
    await loadProfiles()
  }, [loadProfiles])

  const deleteProfile = useCallback(async (id: string) => {
    await window.api.deleteProfile(id)
    if (selectedProfileId === id) {
      setSelectedProfileId(null)
    }
    await loadProfiles()
  }, [loadProfiles, selectedProfileId, setSelectedProfileId])

  useEffect(() => {
    loadProfiles()
  }, [loadProfiles])

  return {
    profiles,
    selectedProfileId,
    setSelectedProfileId,
    createProfile,
    updateProfile,
    deleteProfile,
    loadProfiles
  }
}
