import { useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '../stores/appStore'

export function useRecording() {
  const isRecording = useAppStore((s) => s.isRecording)
  const isGenerating = useAppStore((s) => s.isGenerating)
  const currentSessionId = useAppStore((s) => s.currentSessionId)
  const selectedProfileId = useAppStore((s) => s.selectedProfileId)
  const transcript = useAppStore((s) => s.transcript)
  const notesMarkdown = useAppStore((s) => s.notesMarkdown)
  const error = useAppStore((s) => s.error)

  const setRecording = useAppStore((s) => s.setRecording)
  const setGenerating = useAppStore((s) => s.setGenerating)
  const setCurrentSessionId = useAppStore((s) => s.setCurrentSessionId)
  const appendTranscript = useAppStore((s) => s.appendTranscript)
  const setNotesMarkdown = useAppStore((s) => s.setNotesMarkdown)
  const setError = useAppStore((s) => s.setError)
  const resetRecording = useAppStore((s) => s.resetRecording)

  const listenersSetup = useRef(false)

  // Setup IPC event listeners once
  useEffect(() => {
    if (listenersSetup.current || !window.api) return
    listenersSetup.current = true

    window.api.onTranscriptDelta((delta) => {
      useAppStore.getState().appendTranscript(delta.text)
    })

    window.api.onTranscriptCompleted((_data) => {
      // Completed turn - add a newline for separation
      useAppStore.getState().appendTranscript('\n')
    })

    window.api.onNotesReady((markdown) => {
      useAppStore.getState().setNotesMarkdown(markdown)
      useAppStore.getState().setGenerating(false)
    })

    window.api.onRecordingStatus((status) => {
      if (status === 'generating') {
        useAppStore.getState().setGenerating(true)
      }
    })

    window.api.onError((msg) => {
      useAppStore.getState().setError(msg)
    })

    return () => {
      window.api?.removeAllListeners('transcript:delta')
      window.api?.removeAllListeners('transcript:completed')
      window.api?.removeAllListeners('notes:ready')
      window.api?.removeAllListeners('recording:status')
      window.api?.removeAllListeners('app:error')
    }
  }, [])

  const startRecording = useCallback(async () => {
    if (!selectedProfileId) {
      setError('Please select a prompt profile first')
      return
    }

    setError(null)
    useAppStore.getState().setTranscript('')
    setNotesMarkdown(null)

    if (!window.api) { setError('Not running in Electron'); return }
    const result = await window.api.startRecording(selectedProfileId)
    if (result.success) {
      setRecording(true)
      setCurrentSessionId(result.sessionId || null)
    } else {
      setError(result.error || 'Failed to start recording')
    }
  }, [selectedProfileId, setRecording, setCurrentSessionId, setNotesMarkdown, setError])

  const stopRecording = useCallback(async () => {
    if (!window.api) return
    const result = await window.api.stopRecording()
    setRecording(false)

    if (result.success && result.sessionId) {
      // Automatically generate notes
      setGenerating(true)
      const notesResult = await window.api.generateNotes(result.sessionId)
      if (notesResult.success && notesResult.notes) {
        setNotesMarkdown(notesResult.notes)
      } else {
        setError(notesResult.error || 'Failed to generate notes')
      }
      setGenerating(false)
    } else {
      setError(result.error || 'Failed to stop recording')
    }
  }, [setRecording, setGenerating, setNotesMarkdown, setError])

  return {
    isRecording,
    isGenerating,
    currentSessionId,
    transcript,
    notesMarkdown,
    error,
    startRecording,
    stopRecording,
    resetRecording,
    setError
  }
}
