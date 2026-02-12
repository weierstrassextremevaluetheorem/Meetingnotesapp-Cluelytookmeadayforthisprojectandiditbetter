import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAppStore } from '../stores/appStore'
import type { MeetingSession } from '../types'

export function SessionDetail() {
  const selectedSessionId = useAppStore((s) => s.selectedSessionId)
  const setView = useAppStore((s) => s.setView)
  const setToast = useAppStore((s) => s.setToast)
  const [session, setSession] = useState<MeetingSession | null>(null)
  const [showTranscript, setShowTranscript] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState<number | null>(null)

  useEffect(() => {
    if (selectedSessionId) {
      window.api.getSession(selectedSessionId).then((s) => {
        setSession(s as MeetingSession | null)
        if (s) setFeedbackGiven(s.feedbackRating ?? null)
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
      setToast('Notes copied!')
    }
  }

  const handleCopyTranscript = async () => {
    if (session.transcriptText) {
      await navigator.clipboard.writeText(session.transcriptText)
      setToast('Transcript copied!')
    }
  }

  const handleExport = async () => {
    await window.api.exportSessionMd(session.id)
  }

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    try {
      const result = await window.api.generateNotes(session.id)
      if (result.success && result.notes) {
        setSession({ ...session, notesMarkdown: result.notes, status: 'completed' })
        setToast('Notes regenerated!')
      } else {
        setToast(result.error || 'Regeneration failed')
      }
    } catch {
      setToast('Regeneration failed')
    }
    setIsRegenerating(false)
  }

  const handleFeedback = async (rating: number) => {
    await window.api.setSessionFeedback(session.id, rating)
    setFeedbackGiven(rating)
    setSession({ ...session, feedbackRating: rating })
    setToast(rating === 1 ? 'Thanks for the feedback!' : 'Noted. Try regenerating with a different profile.')
  }

  const handleSlackExport = async () => {
    const result = await window.api.exportToSlack(session.id)
    setToast(result.success ? 'Sent to Slack!' : (result.error || 'Slack export failed'))
  }

  const handleNotionExport = async () => {
    const result = await window.api.exportToNotion(session.id)
    setToast(result.success ? 'Created in Notion!' : (result.error || 'Notion export failed'))
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const canRegenerate = session.transcriptText && (session.status === 'completed' || session.status === 'failed')

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
          <span className="text-xs font-medium text-white/80">
            {session.title || session.profileName}
          </span>
          {session.status === 'failed' && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
              Failed
            </span>
          )}
        </div>
        <p className="text-[10px] text-white/30">{formatDate(session.startedAt)}</p>
      </div>

      {/* Toggle */}
      <div className="flex items-center px-3 py-1.5 gap-1 border-b border-white/5">
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

        {/* Feedback */}
        {session.notesMarkdown && (
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => handleFeedback(1)}
              className={`px-1.5 py-0.5 rounded text-[10px] transition-all ${
                feedbackGiven === 1
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-white/25 hover:text-emerald-400 hover:bg-emerald-500/10'
              }`}
              title="Good notes"
            >
              +1
            </button>
            <button
              onClick={() => handleFeedback(-1)}
              className={`px-1.5 py-0.5 rounded text-[10px] transition-all ${
                feedbackGiven === -1
                  ? 'bg-red-500/20 text-red-400'
                  : 'text-white/25 hover:text-red-400 hover:bg-red-500/10'
              }`}
              title="Poor notes"
            >
              -1
            </button>
          </div>
        )}
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
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <p className="text-[12px] text-white/30 italic">
              {session.status === 'failed' ? 'Notes generation failed.' : 'No notes generated.'}
            </p>
            {canRegenerate && (
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="px-3 py-1.5 rounded-md bg-amber-500/20 text-amber-400 text-[11px]
                           hover:bg-amber-500/30 transition-colors border border-amber-500/20
                           disabled:opacity-50"
              >
                {isRegenerating ? 'Regenerating...' : 'Regenerate Notes'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Export */}
      <div className="flex flex-wrap gap-1.5 px-3 py-2 border-t border-white/5">
        {session.notesMarkdown && (
          <>
            <ExportBtn onClick={handleCopyNotes} title="Copy notes to clipboard">
              Copy Notes
            </ExportBtn>
            <ExportBtn onClick={handleExport} title="Save notes as .md file">
              Save .md
            </ExportBtn>
            <ExportBtn onClick={handleSlackExport} title="Send to Slack">
              Slack
            </ExportBtn>
            <ExportBtn onClick={handleNotionExport} title="Create Notion page">
              Notion
            </ExportBtn>
          </>
        )}
        {session.transcriptText && (
          <ExportBtn onClick={handleCopyTranscript} title="Copy transcript to clipboard">
            Copy Transcript
          </ExportBtn>
        )}
        {canRegenerate && session.notesMarkdown && (
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="ml-auto px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/15 text-[10px]
                       text-amber-400/80 hover:bg-amber-500/20 hover:text-amber-400 transition-all
                       disabled:opacity-50"
          >
            {isRegenerating ? 'Regenerating...' : 'Regenerate'}
          </button>
        )}
      </div>
    </div>
  )
}

function ExportBtn({ onClick, title, children }: {
  onClick: () => void; title: string; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="px-2 py-1 rounded-md bg-white/5 border border-white/8 text-[10px]
                 text-white/60 hover:text-white/80 hover:bg-white/10 transition-all"
    >
      {children}
    </button>
  )
}
