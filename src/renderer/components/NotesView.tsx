import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAppStore } from '../stores/appStore'

export function NotesView() {
  const notesMarkdown = useAppStore((s) => s.notesMarkdown)
  const isGenerating = useAppStore((s) => s.isGenerating)

  if (!notesMarkdown && !isGenerating) {
    return null
  }

  return (
    <div className="flex flex-col min-h-0 border-t border-white/5">
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-[11px] font-medium text-white/50 uppercase tracking-wider">
          Meeting Notes
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-2 min-h-0 max-h-[260px]">
        {isGenerating ? (
          <div className="flex items-center gap-2 py-4">
            <svg className="w-4 h-4 animate-spin text-amber-400" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="15" />
            </svg>
            <span className="text-xs text-white/50">Generating meeting notes...</span>
          </div>
        ) : notesMarkdown ? (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {notesMarkdown}
            </ReactMarkdown>
          </div>
        ) : null}
      </div>
    </div>
  )
}
