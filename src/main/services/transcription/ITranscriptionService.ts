import { EventEmitter } from 'events'

/**
 * Common interface for all transcription providers.
 *
 * Events emitted:
 *  - 'delta'     { itemId: string; text: string; timestamp: number }
 *  - 'completed' { itemId: string; text: string; timestamp: number }
 *  - 'connected'
 *  - 'disconnected'
 *  - 'error'     string
 */
export interface ITranscriptionService extends EventEmitter {
  connect(transcriptionPrompt?: string): Promise<void>
  sendAudio(base64Pcm: string): void
  disconnect(): Promise<void>
}
