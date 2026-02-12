import { useAppStore } from '../stores/appStore'

export function ExportBar() {
  const notesMarkdown = useAppStore((s) => s.notesMarkdown)
  const transcript = useAppStore((s) => s.transcript)
  const currentSessionId = useAppStore((s) => s.currentSessionId)
  const setView = useAppStore((s) => s.setView)

  const handleCopyNotes = async () => {
    if (notesMarkdown) {
      await navigator.clipboard.writeText(notesMarkdown)
    }
  }

  const handleCopyTranscript = async () => {
    if (transcript) {
      await navigator.clipboard.writeText(transcript)
    }
  }

  const handleSaveMd = async () => {
    if (currentSessionId) {
      await window.api.exportSessionMd(currentSessionId)
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
            <ExportButton onClick={handleSaveMd} title="Save notes as .md file">
              Save .md
            </ExportButton>
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
