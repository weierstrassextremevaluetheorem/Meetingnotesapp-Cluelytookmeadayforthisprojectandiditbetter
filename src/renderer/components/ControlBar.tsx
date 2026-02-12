import { useRecording } from '../hooks/useRecording'
import { useProfiles } from '../hooks/useProfiles'

export function ControlBar() {
  const { isRecording, isGenerating, startRecording, stopRecording } = useRecording()
  const { profiles, selectedProfileId, setSelectedProfileId } = useProfiles()

  return (
    <div className="px-3 py-2.5 border-b border-white/5 space-y-2">
      {/* Profile selector */}
      <div className="flex items-center gap-2">
        <label className="text-[11px] text-white/50 whitespace-nowrap">Profile:</label>
        <select
          value={selectedProfileId || ''}
          onChange={(e) => setSelectedProfileId(e.target.value)}
          disabled={isRecording}
          aria-label="Prompt Profile"
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1
                     text-xs text-white/80 outline-none focus:border-white/20
                     disabled:opacity-50 disabled:cursor-not-allowed
                     appearance-none cursor-pointer"
        >
          <option value="" disabled>Select profile...</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id} className="bg-gray-900 text-white">
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Start/Stop button */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isGenerating || (!selectedProfileId && !isRecording)}
        className={`w-full py-2 rounded-lg text-xs font-semibold transition-all
          ${isRecording
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
            : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
          }
          disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="15" />
            </svg>
            Generating Notes...
          </span>
        ) : isRecording ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-red-400" />
            Stop Recording
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            Start Recording
          </span>
        )}
      </button>
    </div>
  )
}
