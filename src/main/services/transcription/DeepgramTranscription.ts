import WebSocket from 'ws'
import { EventEmitter } from 'events'
import { SettingsStore } from '../SettingsStore'
import type { ITranscriptionService } from './ITranscriptionService'

/**
 * Deepgram live streaming transcription over WebSocket.
 *
 * Deepgram accepts raw PCM audio directly over WebSocket (binary frames).
 * Audio format: 24 kHz, 16-bit, mono, little-endian (linear16).
 *
 * Protocol reference:
 *   wss://api.deepgram.com/v1/listen?model=nova-3&encoding=linear16&sample_rate=24000&channels=1
 *
 * It returns JSON messages with partial and final transcripts.
 */
export class DeepgramTranscription extends EventEmitter implements ITranscriptionService {
  private ws: WebSocket | null = null
  private apiKey: string
  private model: string
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnects = 3
  private shouldReconnect = false
  private turnCounter = 0
  private keywords: string[] = []

  constructor() {
    super()
    this.apiKey = SettingsStore.getDeepgramApiKey()
    this.model = SettingsStore.getDeepgramModel()
  }

  async connect(transcriptionPrompt = ''): Promise<void> {
    if (!this.apiKey) {
      this.emit('error', 'Deepgram API key not set. Go to Settings.')
      return
    }
    // Parse keyword hints from the prompt (comma-separated)
    this.keywords = transcriptionPrompt
      ? transcriptionPrompt.split(',').map((s) => s.trim()).filter(Boolean)
      : []
    this.shouldReconnect = true
    this.reconnectAttempts = 0
    await this.doConnect()
  }

  /**
   * Deepgram expects raw binary PCM, not base64.
   * We decode the base64 string and send it as a binary frame.
   */
  sendAudio(base64Pcm: string): void {
    if (!this.isConnected || !this.ws) return
    try {
      const buf = Buffer.from(base64Pcm, 'base64')
      this.ws.send(buf)
    } catch (err) {
      console.error('[Deepgram] send error:', err)
    }
  }

  async disconnect(): Promise<void> {
    this.shouldReconnect = false
    this.isConnected = false
    if (this.ws) {
      try {
        // Deepgram close signal: send an empty byte message
        this.ws.send(Buffer.alloc(0))
        this.ws.close(1000)
      } catch {}
      this.ws = null
    }
  }

  // ── internals ──────────────────────────────────────────────

  private doConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const params = new URLSearchParams({
        model: this.model,
        encoding: 'linear16',
        sample_rate: '24000',
        channels: '1',
        punctuate: 'true',
        interim_results: 'true',
        vad_events: 'true',
        smart_format: 'true',
        language: 'en'
      })

      // Add keywords as search params
      for (const kw of this.keywords) {
        params.append('keywords', kw)
      }

      const url = `wss://api.deepgram.com/v1/listen?${params.toString()}`
      console.log(`[Deepgram] Connecting...`)

      this.ws = new WebSocket(url, {
        headers: { Authorization: `Token ${this.apiKey}` }
      })

      this.ws.on('open', () => {
        console.log('[Deepgram] Connected.')
        this.isConnected = true
        this.reconnectAttempts = 0
        this.emit('connected')
        resolve()
      })

      this.ws.on('message', (raw: WebSocket.Data) => {
        try {
          const msg = JSON.parse(raw.toString())
          this.handleMessage(msg)
        } catch {}
      })

      this.ws.on('close', () => {
        this.isConnected = false
        this.emit('disconnected')
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnects) this.retry()
      })

      this.ws.on('error', (err) => {
        this.isConnected = false
        this.emit('error', `Deepgram WebSocket error: ${err.message}`)
        reject(err)
      })
    })
  }

  private handleMessage(msg: DeepgramResponse): void {
    if (msg.type === 'Results') {
      const alt = msg.channel?.alternatives?.[0]
      if (!alt) return
      const text = alt.transcript
      if (!text) return

      const itemId = `dg-${this.turnCounter}`

      if (msg.is_final) {
        this.turnCounter++
        this.emit('completed', { itemId, text, timestamp: Date.now() })
      } else {
        this.emit('delta', { itemId, text, timestamp: Date.now() })
      }
    } else if (msg.type === 'Metadata') {
      console.log('[Deepgram] Metadata:', msg.request_id)
    } else if (msg.type === 'SpeechStarted') {
      // VAD detected speech start
    } else if (msg.type === 'Error' || msg.type === 'CloseStream') {
      if (msg.description) this.emit('error', msg.description)
    }
  }

  private retry(): void {
    this.reconnectAttempts++
    const delay = Math.pow(2, this.reconnectAttempts) * 1000
    console.log(`[Deepgram] reconnecting in ${delay}ms (${this.reconnectAttempts}/${this.maxReconnects})`)
    setTimeout(() => this.doConnect().catch(() => {
      if (this.reconnectAttempts >= this.maxReconnects) this.emit('error', 'Max reconnect attempts reached')
    }), delay)
  }
}

// ── Deepgram response types ────────────────────────────────────

interface DeepgramResponse {
  type: string
  channel?: {
    alternatives?: Array<{
      transcript: string
      confidence: number
      words?: Array<{ word: string; start: number; end: number }>
    }>
  }
  is_final?: boolean
  speech_final?: boolean
  request_id?: string
  description?: string
}
