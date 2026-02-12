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

  // On first load, check if API key is set; if not, go to settings
  useEffect(() => {
    if (!window.api) return
    window.api.getApiKeyMasked().then((masked) => {
      if (!masked) {
        setView('settings')
      }
    })
  }, [setView])

  return (
    <div className="w-full h-full p-2">
      <div className="glass-panel w-full h-full flex flex-col overflow-hidden">
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
      </div>
    </div>
  )
}
