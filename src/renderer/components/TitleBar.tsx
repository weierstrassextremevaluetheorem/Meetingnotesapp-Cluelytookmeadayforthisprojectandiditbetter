import { useAppStore } from '../stores/appStore'
import type { AppView } from '../types'

export function TitleBar() {
  const currentView = useAppStore((s) => s.currentView)
  const setView = useAppStore((s) => s.setView)
  const setCollapsed = useAppStore((s) => s.setCollapsed)
  const isRecording = useAppStore((s) => s.isRecording)

  const handleCollapse = () => {
    setCollapsed(true)
    window.api?.collapseWindow()
  }

  const handleClose = () => {
    window.api?.closeWindow()
  }

  return (
    <div className="drag-region flex items-center justify-between px-3 py-2 border-b border-white/5">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse-recording' : 'bg-emerald-500'}`} />
        <span className="text-xs font-semibold text-white/80 select-none">
          Meeting Assistant
        </span>
      </div>

      <div className="no-drag flex items-center gap-1">
        {/* Nav buttons */}
        <NavBtn
          active={currentView === 'recording'}
          onClick={() => setView('recording')}
          title="Record"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <circle cx="12" cy="12" r="4" fill="currentColor" />
          </svg>
        </NavBtn>
        <NavBtn
          active={currentView === 'profiles'}
          onClick={() => setView('profiles')}
          title="Profiles"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </NavBtn>
        <NavBtn
          active={currentView === 'history' || currentView === 'session-detail'}
          onClick={() => setView('history')}
          title="History"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </NavBtn>
        <NavBtn
          active={currentView === 'settings'}
          onClick={() => setView('settings')}
          title="Settings"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </NavBtn>

        <div className="w-px h-4 bg-white/10 mx-1" />

        {/* Collapse */}
        <button
          onClick={handleCollapse}
          className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors"
          title="Collapse"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Close (hide) */}
        <button
          onClick={handleClose}
          className="p-1 rounded hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
          title="Hide"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function NavBtn({ active, onClick, title, children }: {
  active: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-white/10 text-white'
          : 'text-white/40 hover:text-white/70 hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  )
}
