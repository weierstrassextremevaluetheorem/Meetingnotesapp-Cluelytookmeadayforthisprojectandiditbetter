import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAppStore } from '../stores/appStore'
import type { MeetingSession } from '../types'

export function SessionDetail() {
  const selectedSessionId = useAppStore((s) => s.selectedSessionId)
  const setView = useAppStore((s) => s.setView)
  const [session, setSession] = useState<MeetingSession | null>(null)
  const [showTranscript, setShowTranscript] = useState(false)

  useEffect(() => {
    if (selectedSessionId) {
      window.api.getSession(selectedSessionId).then((s) => {
        setSession(s as MeetingSession | null)
      })
    }
  }, [selectedSessionId])

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-white/30">Session not found</p>
      </div>
    )
  }

  const handleCopyNotes = async () => {
    if (session.notesMarkdown) {
      await navigator.clipboard.writeText(session.notesMarkdown)
    }
  }

  const handleCopyTranscript = async () => {
    if (session.transcriptText) {
      await navigator.clipboard.writeText(session.transcriptText)
    }
  }

  const handleExport = async () => {
    await window.api.exportSessionMd(session.id)
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={() => setView('history')}
            className="text-[10px] text-white/40 hover:text-white/70 transition-colors"
          >
            &larr; Back
          </button>
          <span className="text-xs font-medium text-white/80">{session.profileName}</span>
        </div>
        <p className="text-[10px] text-white/30">{formatDate(session.startedAt)}</p>
      </div>

      {/* Toggle */}
      <div className="flex px-3 py-1.5 gap-1 border-b border-white/5">
        <button
          onClick={() => setShowTranscript(false)}
          className={`px-2 py-1 rounded text-[10px] transition-colors ${
            !showTranscript ? 'bg-white/10 text-white/80' : 'text-white/40 hover:text-white/60'
          }`}
        >
          Notes
        </button>
        <button
          onClick={() => setShowTranscript(true)}
          className={`px-2 py-1 rounded text-[10px] transition-colors ${
            showTranscript ? 'bg-white/10 text-white/80' : 'text-white/40 hover:text-white/60'
          }`}
        >
          Transcript
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
        {showTranscript ? (
          <p className="text-[12px] text-white/70 leading-relaxed whitespace-pre-wrap">
            {session.transcriptText || 'No transcript available.'}
          </p>
        ) : session.notesMarkdown ? (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {session.notesMarkdown}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-[12px] text-white/30 italic">No notes generated.</p>
        )}
      </div>

      {/* Export */}
      <div className="flex gap-1.5 px-3 py-2 border-t border-white/5">
        {session.notesMarkdown && (
          <>
            <button
              onClick={handleCopyNotes}
              className="px-2 py-1 rounded-md bg-white/5 border border-white/8 text-[10px]
                         text-white/60 hover:text-white/80 hover:bg-white/10 transition-all"
            >
              Copy Notes
            </button>
            <button
              onClick={handleExport}
              className="px-2 py-1 rounded-md bg-white/5 border border-white/8 text-[10px]
                         text-white/60 hover:text-white/80 hover:bg-white/10 transition-all"
            >
              Save .md
            </button>
          </>
        )}
        {session.transcriptText && (
          <button
            onClick={handleCopyTranscript}
            className="px-2 py-1 rounded-md bg-white/5 border border-white/8 text-[10px]
                       text-white/60 hover:text-white/80 hover:bg-white/10 transition-all"
          >
            Copy Transcript
          </button>
        )}
      </div>
    </div>
  )
}
