import { useAppStore } from '../stores/appStore'

export function ExportBar() {
  const notesMarkdown = useAppStore((s) => s.notesMarkdown)
  const transcript = useAppStore((s) => s.transcript)
  const currentSessionId = useAppStore((s) => s.currentSessionId)
  const setView = useAppStore((s) => s.setView)
  const setToast = useAppStore((s) => s.setToast)

  const handleCopyNotes = async () => {
    if (notesMarkdown) {
      await navigator.clipboard.writeText(notesMarkdown)
      setToast('Notes copied!')
    }
  }

  const handleCopyTranscript = async () => {
    if (transcript) {
      await navigator.clipboard.writeText(transcript)
      setToast('Transcript copied!')
    }
  }

  const handleSaveMd = async () => {
    if (currentSessionId) {
      await window.api.exportSessionMd(currentSessionId)
    }
  }

  const handleSlack = async () => {
    if (currentSessionId) {
      const result = await window.api.exportToSlack(currentSessionId)
      setToast(result.success ? 'Sent to Slack!' : (result.error || 'Slack export failed'))
    }
  }

  const handleNotion = async () => {
    if (currentSessionId) {
      const result = await window.api.exportToNotion(currentSessionId)
      setToast(result.success ? 'Created in Notion!' : (result.error || 'Notion export failed'))
    }
  }

  const hasContent = notesMarkdown || transcript

  if (!hasContent) return null

  return (
    <div className="flex items-center gap-1.5 px-3 py-2 border-t border-white/5">
      {notesMarkdown && (
        <>
          <ExportButton onClick={handleCopyNotes} title="Copy notes to clipboard">
            Copy Notes
          </ExportButton>
          {currentSessionId && (
            <>
              <ExportButton onClick={handleSaveMd} title="Save notes as .md file">
                Save .md
              </ExportButton>
              <ExportButton onClick={handleSlack} title="Send to Slack">
                Slack
              </ExportButton>
              <ExportButton onClick={handleNotion} title="Create Notion page">
                Notion
              </ExportButton>
            </>
          )}
        </>
      )}
      {transcript && (
        <ExportButton onClick={handleCopyTranscript} title="Copy transcript to clipboard">
          Copy Transcript
        </ExportButton>
      )}
      <div className="flex-1" />
      <button
        onClick={() => setView('history')}
        className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
      >
        History
      </button>
    </div>
  )
}

function ExportButton({ onClick, title, children }: {
  onClick: () => void
  title: string
  children: React.ReactNode
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
