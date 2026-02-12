import { useEffect } from 'react'
import { useAppStore } from '../stores/appStore'
import { TitleBar } from './TitleBar'
import { StatusIndicator } from './StatusIndicator'
import { ControlBar } from './ControlBar'
import { TranscriptView } from './TranscriptView'
import { NotesView } from './NotesView'
import { ExportBar } from './ExportBar'
import { ProfileEditor } from './ProfileEditor'
import { SessionHistory } from './SessionHistory'
import { SessionDetail } from './SessionDetail'
import { SettingsView } from './SettingsView'

export function OverlayPanel() {
  const currentView = useAppStore((s) => s.currentView)
  const setView = useAppStore((s) => s.setView)
  const toast = useAppStore((s) => s.toast)
  const setToast = useAppStore((s) => s.setToast)

  // On first load, check if API key is set; if not, go to settings
  useEffect(() => {
    if (!window.api) return
    window.api.getApiKeyMasked().then((masked) => {
      if (!masked) {
        setView('settings')
      }
    })
  }, [setView])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(timer)
  }, [toast, setToast])

  return (
    <div className="w-full h-full p-2">
      <div className="glass-panel w-full h-full flex flex-col overflow-hidden relative">
        <TitleBar />
        {currentView === 'recording' && (
          <div className="flex flex-col flex-1 min-h-0">
            <StatusIndicator />
            <ControlBar />
            <TranscriptView />
            <NotesView />
            <ExportBar />
          </div>
        )}
        {currentView === 'profiles' && <ProfileEditor />}
        {currentView === 'history' && <SessionHistory />}
        {currentView === 'session-detail' && <SessionDetail />}
        {currentView === 'settings' && <SettingsView />}

        {/* Toast notification */}
        {toast && (
          <div className="absolute bottom-3 left-3 right-3 flex justify-center pointer-events-none z-50">
            <div className="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10
                            text-[11px] text-white/80 shadow-lg animate-fade-in pointer-events-auto">
              {toast}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
