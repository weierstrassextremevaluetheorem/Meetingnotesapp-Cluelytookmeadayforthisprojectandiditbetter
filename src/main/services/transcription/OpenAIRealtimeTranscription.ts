import WebSocket from 'ws'
import { EventEmitter } from 'events'
import { SettingsStore } from '../SettingsStore'
import type { ITranscriptionService } from './ITranscriptionService'

interface RealtimeEvent {
  type: string
  item_id?: string
  delta?: string
  transcript?: string
  error?: { type: string; code: string; message: string }
}

/**
 * OpenAI Realtime Transcription API over WebSocket.
 * Accepts 24kHz mono PCM16 base64 audio, emits transcript deltas + completions.
 */
export class OpenAIRealtimeTranscription extends EventEmitter implements ITranscriptionService {
  private ws: WebSocket | null = null
  private apiKey: string
  private model: string
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnects = 3
  private prompt = ''
  private shouldReconnect = false

  constructor() {
    super()
    this.apiKey = SettingsStore.getOpenAiApiKey()
    this.model = SettingsStore.getTranscriptionModel()
  }

  async connect(transcriptionPrompt = ''): Promise<void> {
    if (!this.apiKey) {
      this.emit('error', 'OpenAI API key not set. Go to Settings.')
      return
    }
    this.prompt = transcriptionPrompt
    this.shouldReconnect = true
    this.reconnectAttempts = 0
    await this.doConnect()
  }

  sendAudio(base64Pcm: string): void {
    if (!this.isConnected || !this.ws) return
    try {
      this.ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: base64Pcm }))
    } catch (err) {
      console.error('[OpenAI-RT] send error:', err)
    }
  }

  async disconnect(): Promise<void> {
    this.shouldReconnect = false
    this.isConnected = false
    if (this.ws) { try { this.ws.close(1000) } catch {} this.ws = null }
  }

  // ── internals ──────────────────────────────────────────────

  private doConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `wss://api.openai.com/v1/realtime?model=${this.model}`
      console.log(`[OpenAI-RT] Connecting ${url}`)

      this.ws = new WebSocket(url, { headers: { Authorization: `Bearer ${this.apiKey}` } })

      this.ws.on('open', () => {
        this.isConnected = true
        this.reconnectAttempts = 0
        this.sendSessionUpdate()
        this.emit('connected')
        resolve()
      })

      this.ws.on('message', (raw: WebSocket.Data) => {
        try { this.handleEvent(JSON.parse(raw.toString())) } catch {}
      })

      this.ws.on('close', (code) => {
        this.isConnected = false
        this.emit('disconnected')
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnects) this.retry()
      })

      this.ws.on('error', (err) => {
        this.isConnected = false
        this.emit('error', `WebSocket error: ${err.message}`)
        reject(err)
      })
    })
  }

  private sendSessionUpdate(): void {
    if (!this.ws) return
    this.ws.send(JSON.stringify({
      type: 'session.update',
      session: {
        type: 'transcription',
        audio: {
          input: {
            format: { type: 'audio/pcm', rate: 24000 },
            noise_reduction: { type: 'far_field' },
            transcription: { model: this.model, language: 'en', prompt: this.prompt },
            turn_detection: { type: 'server_vad', threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 500 }
          }
        }
      }
    }))
    console.log('[OpenAI-RT] session.update sent')
  }

  private handleEvent(e: RealtimeEvent): void {
    switch (e.type) {
      case 'conversation.item.input_audio_transcription.delta':
        this.emit('delta', { itemId: e.item_id || '', text: e.delta || '', timestamp: Date.now() })
        break
      case 'conversation.item.input_audio_transcription.completed':
        this.emit('completed', { itemId: e.item_id || '', text: e.transcript || '', timestamp: Date.now() })
        break
      case 'error':
        this.emit('error', e.error?.message || 'OpenAI Realtime error')
        break
    }
  }

  private retry(): void {
    this.reconnectAttempts++
    const delay = Math.pow(2, this.reconnectAttempts) * 1000
    console.log(`[OpenAI-RT] reconnecting in ${delay}ms (${this.reconnectAttempts}/${this.maxReconnects})`)
    setTimeout(() => this.doConnect().catch(() => {
      if (this.reconnectAttempts >= this.maxReconnects) this.emit('error', 'Max reconnect attempts reached')
    }), delay)
  }
}
