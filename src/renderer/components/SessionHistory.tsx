import { useState, useCallback, useEffect } from 'react'
import { useAppStore } from '../stores/appStore'
import type { MeetingSession } from '../types'

export function SessionHistory() {
  const sessions = useAppStore((s) => s.sessions)
  const setSessions = useAppStore((s) => s.setSessions)
  const setView = useAppStore((s) => s.setView)
  const setSelectedSessionId = useAppStore((s) => s.setSelectedSessionId)
  const setToast = useAppStore((s) => s.setToast)

  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const loadSessions = useCallback(async () => {
    if (!window.api) return
    try {
      const list = await window.api.listSessions()
      setSessions(list as MeetingSession[])
    } catch (err) {
      console.error('Failed to load sessions:', err)
    }
  }, [setSessions])

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    if (!window.api) return
    setIsSearching(true)
    try {
      if (query.trim()) {
        const results = await window.api.searchSessions(query.trim())
        setSessions(results as MeetingSession[])
      } else {
        await loadSessions()
      }
    } catch (err) {
      console.error('Search failed:', err)
    }
    setIsSearching(false)
  }, [setSessions, loadSessions])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const handleViewSession = (id: string) => {
    setSelectedSessionId(id)
    setView('session-detail')
  }

  const handleExport = async (id: string) => {
    await window.api.exportSessionMd(id)
  }

  const handleDelete = async (id: string) => {
    await window.api.deleteSession(id)
    if (searchQuery.trim()) {
      await handleSearch(searchQuery)
    } else {
      await loadSessions()
    }
    setToast('Session deleted')
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const statusColors: Record<string, string> = {
    recording: 'text-red-400',
    generating: 'text-amber-400',
    completed: 'text-emerald-400',
    failed: 'text-red-400'
  }

  const statusIcons: Record<string, string> = {
    completed: '+1',
    failed: '!'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with search */}
      <div className="px-3 py-2 border-b border-white/5 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/70">Session History</span>
          <button
            onClick={loadSessions}
            className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
          >
            Refresh
          </button>
        </div>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search sessions..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5
                       text-xs text-white/80 outline-none focus:border-white/20
                       placeholder:text-white/20 pr-7"
          />
          {isSearching && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <svg className="w-3 h-3 animate-spin text-white/30" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="15" />
              </svg>
            </div>
          )}
          {searchQuery && !isSearching && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/30 hover:text-white/60"
            >
              x
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-[10px] text-white/30">
            {sessions.length} result{sessions.length !== 1 ? 's' : ''} for &ldquo;{searchQuery}&rdquo;
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {sessions.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-xs text-white/25">
              {searchQuery ? 'No sessions match your search.' : 'No sessions yet.'}
            </p>
            {!searchQuery && (
              <p className="text-[10px] text-white/15 mt-1">
                Start a recording to create your first session.
              </p>
            )}
          </div>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              className="px-3 py-2.5 border-b border-white/3 hover:bg-white/3 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-white/80 font-medium">
                    {s.title || s.profileName}
                  </span>
                  {s.feedbackRating === 1 && (
                    <span className="text-[9px] text-emerald-400/60">{statusIcons.completed}</span>
                  )}
                </div>
                <span className={`text-[10px] ${statusColors[s.status] || 'text-white/40'}`}>
                  {s.status}
                </span>
              </div>
              <p className="text-[10px] text-white/30">{formatDate(s.startedAt)}</p>
              {s.transcriptText && (
                <p className="text-[10px] text-white/20 truncate mt-0.5">
                  {s.transcriptText.slice(0, 100)}...
                </p>
              )}
              <div className="flex gap-2 mt-1.5">
                <button
                  onClick={() => handleViewSession(s.id)}
                  className="text-[10px] text-blue-400/70 hover:text-blue-400 transition-colors"
                >
                  View
                </button>
                {s.notesMarkdown && (
                  <button
                    onClick={() => handleExport(s.id)}
                    className="text-[10px] text-emerald-400/70 hover:text-emerald-400 transition-colors"
                  >
                    Export
                  </button>
                )}
                <button
                  onClick={() => handleDelete(s.id)}
                  className="text-[10px] text-red-400/50 hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
