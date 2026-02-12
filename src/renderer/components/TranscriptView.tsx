import { useRef, useEffect } from 'react'
import { useAppStore } from '../stores/appStore'

export function TranscriptView() {
  const transcript = useAppStore((s) => s.transcript)
  const isRecording = useAppStore((s) => s.isRecording)
  const scrollRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)

  // Auto-scroll to bottom when transcript updates
  useEffect(() => {
    if (autoScrollRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcript])

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    // If user scrolled up more than 50px from bottom, disable auto-scroll
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-[11px] font-medium text-white/50 uppercase tracking-wider">
          Transcript
        </span>
        {isRecording && (
          <span className="text-[10px] text-red-400/70 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-recording" />
            Live
          </span>
        )}
      </div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 pb-2 min-h-0"
      >
        {transcript ? (
          <p className="text-[12px] text-white/75 leading-relaxed whitespace-pre-wrap break-words">
            {transcript}
          </p>
        ) : (
          <p className="text-[12px] text-white/25 italic">
            {isRecording
              ? 'Listening for audio...'
              : 'Start recording to see the live transcript here.'}
          </p>
        )}
      </div>
    </div>
  )
}
