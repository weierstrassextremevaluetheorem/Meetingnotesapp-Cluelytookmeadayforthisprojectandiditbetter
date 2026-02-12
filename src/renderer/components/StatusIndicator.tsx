import { useAppStore } from '../stores/appStore'

export function StatusIndicator() {
  const isRecording = useAppStore((s) => s.isRecording)
  const isGenerating = useAppStore((s) => s.isGenerating)
  const error = useAppStore((s) => s.error)

  let color = 'bg-gray-500'
  let label = 'Ready'

  if (error) {
    color = 'bg-red-500'
    label = 'Error'
  } else if (isRecording) {
    color = 'bg-red-500 animate-pulse-recording'
    label = 'Recording'
  } else if (isGenerating) {
    color = 'bg-amber-500 animate-pulse'
    label = 'Generating notes...'
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-[11px] text-white/60">{label}</span>
      {error && (
        <span className="text-[10px] text-red-400/80 truncate flex-1" title={error}>
          {error}
        </span>
      )}
    </div>
  )
}
