import { SettingsStore } from '../SettingsStore'
import type { ITranscriptionService } from './ITranscriptionService'
import { OpenAIRealtimeTranscription } from './OpenAIRealtimeTranscription'
import { DeepgramTranscription } from './DeepgramTranscription'

export type { ITranscriptionService } from './ITranscriptionService'

/**
 * Factory: creates the right transcription service based on the current
 * provider setting.
 */
export function createTranscriptionService(): ITranscriptionService {
  const provider = SettingsStore.getTranscriptionProvider()
  console.log(`[TranscriptionFactory] provider = ${provider}`)

  switch (provider) {
    case 'deepgram':
      return new DeepgramTranscription()
    case 'openai-realtime':
    default:
      return new OpenAIRealtimeTranscription()
  }
}
