import { useAppStore } from '../stores/appStore'

export function CollapsedPill() {
  const isRecording = useAppStore((s) => s.isRecording)
  const setCollapsed = useAppStore((s) => s.setCollapsed)

  const handleExpand = () => {
    setCollapsed(false)
    window.api?.collapseWindow() // Tell main process to resize window
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      <button
        onClick={handleExpand}
        className="w-12 h-12 rounded-full glass-panel flex items-center justify-center
                   hover:bg-white/5 transition-all cursor-pointer border border-white/10"
        title="Expand Meeting Assistant"
      >
        <div
          className={`w-3 h-3 rounded-full ${
            isRecording
              ? 'bg-red-500 animate-pulse-recording'
              : 'bg-gray-500'
          }`}
        />
      </button>
    </div>
  )
}
