import { useSessions } from '../hooks/useSessions'
import { useAppStore } from '../stores/appStore'

export function SessionHistory() {
  const { sessions, deleteSession, exportSession, loadSessions } = useSessions()
  const setView = useAppStore((s) => s.setView)
  const setSelectedSessionId = useAppStore((s) => s.setSelectedSessionId)

  const handleViewSession = (id: string) => {
    setSelectedSessionId(id)
    setView('session-detail')
  }

  const handleExport = async (id: string) => {
    await exportSession(id)
  }

  const handleDelete = async (id: string) => {
    await deleteSession(id)
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <span className="text-xs font-medium text-white/70">Session History</span>
        <button
          onClick={loadSessions}
          className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {sessions.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-xs text-white/25">No sessions yet.</p>
            <p className="text-[10px] text-white/15 mt-1">Start a recording to create your first session.</p>
          </div>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              className="px-3 py-2.5 border-b border-white/3 hover:bg-white/3 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/80 font-medium">{s.profileName}</span>
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
                    Export .md
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
