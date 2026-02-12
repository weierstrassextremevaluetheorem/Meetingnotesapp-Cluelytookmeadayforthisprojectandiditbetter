import { useCallback, useEffect } from 'react'
import { useAppStore } from '../stores/appStore'
import type { MeetingSession } from '../types'

export function useSessions() {
  const sessions = useAppStore((s) => s.sessions)
  const setSessions = useAppStore((s) => s.setSessions)
  const selectedSessionId = useAppStore((s) => s.selectedSessionId)
  const setSelectedSessionId = useAppStore((s) => s.setSelectedSessionId)

  const loadSessions = useCallback(async () => {
    if (!window.api) return
    try {
      const list = await window.api.listSessions()
      setSessions(list as MeetingSession[])
    } catch (err) {
      console.error('Failed to load sessions:', err)
    }
  }, [setSessions])

  const deleteSession = useCallback(async (id: string) => {
    await window.api.deleteSession(id)
    if (selectedSessionId === id) {
      setSelectedSessionId(null)
    }
    await loadSessions()
  }, [loadSessions, selectedSessionId, setSelectedSessionId])

  const exportSession = useCallback(async (id: string) => {
    const result = await window.api.exportSessionMd(id)
    return result
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  return {
    sessions,
    selectedSessionId,
    setSelectedSessionId,
    loadSessions,
    deleteSession,
    exportSession
  }
}
