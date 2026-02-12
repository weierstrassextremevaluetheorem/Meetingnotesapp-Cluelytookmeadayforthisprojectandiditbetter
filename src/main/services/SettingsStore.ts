import { DatabaseInit } from './DatabaseInit'

// ── Provider type constants ─────────────────────────────────────

export type TranscriptionProvider = 'openai-realtime' | 'deepgram'
export type LlmProvider = 'openai-compatible' | 'anthropic'

export const TRANSCRIPTION_PROVIDERS: { id: TranscriptionProvider; label: string }[] = [
  { id: 'openai-realtime', label: 'OpenAI Realtime' },
  { id: 'deepgram', label: 'Deepgram' }
]

export const LLM_PROVIDERS: { id: LlmProvider; label: string }[] = [
  { id: 'openai-compatible', label: 'OpenAI-Compatible (OpenAI, Groq, Together, Ollama ...)' },
  { id: 'anthropic', label: 'Anthropic Claude' }
]

// ── Store ───────────────────────────────────────────────────────

/**
 * Stores app settings (API keys, model config, provider selection)
 * in SQLite so users don't need to create .env files.
 */
export class SettingsStore {
  static ensureTable(): void {
    const db = DatabaseInit.getDb()
    db.run(`
      CREATE TABLE IF NOT EXISTS AppSettings (
        Key TEXT PRIMARY KEY,
        Value TEXT NOT NULL
      )
    `)
    DatabaseInit.save()
  }

  static get(key: string): string | null {
    const db = DatabaseInit.getDb()
    const stmt = db.prepare('SELECT Value FROM AppSettings WHERE Key = ?')
    stmt.bind([key])
    if (stmt.step()) {
      const val = stmt.get()[0] as string
      stmt.free()
      return val
    }
    stmt.free()
    return null
  }

  static set(key: string, value: string): void {
    const db = DatabaseInit.getDb()
    const existing = SettingsStore.get(key)
    if (existing !== null) {
      db.run('UPDATE AppSettings SET Value = ? WHERE Key = ?', [value, key])
    } else {
      db.run('INSERT INTO AppSettings (Key, Value) VALUES (?, ?)', [key, value])
    }
    DatabaseInit.save()
  }

  static delete(key: string): void {
    const db = DatabaseInit.getDb()
    db.run('DELETE FROM AppSettings WHERE Key = ?', [key])
    DatabaseInit.save()
  }

  static getAll(): Record<string, string> {
    const db = DatabaseInit.getDb()
    const result = db.exec('SELECT Key, Value FROM AppSettings')
    const settings: Record<string, string> = {}
    if (result.length > 0) {
      for (const row of result[0].values) {
        settings[row[0] as string] = row[1] as string
      }
    }
    return settings
  }

  // ── Provider selection ──────────────────────────────────────

  static getTranscriptionProvider(): TranscriptionProvider {
    return (SettingsStore.get('transcription_provider') as TranscriptionProvider) || 'openai-realtime'
  }

  static getLlmProvider(): LlmProvider {
    return (SettingsStore.get('llm_provider') as LlmProvider) || 'openai-compatible'
  }

  // ── OpenAI keys ─────────────────────────────────────────────

  static getOpenAiApiKey(): string {
    return SettingsStore.get('openai_api_key') || process.env.OPENAI_API_KEY || ''
  }

  static getTranscriptionModel(): string {
    return SettingsStore.get('transcription_model') || process.env.TRANSCRIPTION_MODEL || 'gpt-4o-transcribe'
  }

  // ── Deepgram keys ───────────────────────────────────────────

  static getDeepgramApiKey(): string {
    return SettingsStore.get('deepgram_api_key') || process.env.DEEPGRAM_API_KEY || ''
  }

  static getDeepgramModel(): string {
    return SettingsStore.get('deepgram_model') || 'nova-3'
  }

  // ── LLM (notes) config ─────────────────────────────────────

  static getLlmApiKey(): string {
    const provider = SettingsStore.getLlmProvider()
    if (provider === 'anthropic') {
      return SettingsStore.get('anthropic_api_key') || process.env.ANTHROPIC_API_KEY || ''
    }
    // openai-compatible: use the shared key or a dedicated one
    return SettingsStore.get('llm_api_key') || SettingsStore.getOpenAiApiKey()
  }

  static getLlmModel(): string {
    const provider = SettingsStore.getLlmProvider()
    if (provider === 'anthropic') {
      return SettingsStore.get('llm_model') || 'claude-sonnet-4-20250514'
    }
    return SettingsStore.get('llm_model') || process.env.LLM_MODEL || 'gpt-4o'
  }

  static getLlmEndpoint(): string {
    const provider = SettingsStore.getLlmProvider()
    if (provider === 'anthropic') {
      return SettingsStore.get('llm_endpoint') || 'https://api.anthropic.com/v1/messages'
    }
    return SettingsStore.get('llm_endpoint') || process.env.LLM_ENDPOINT || 'https://api.openai.com/v1/chat/completions'
  }

  // ── Backward-compat alias used by IPC handler ───────────────

  static getApiKey(): string {
    return SettingsStore.getOpenAiApiKey()
  }
}
