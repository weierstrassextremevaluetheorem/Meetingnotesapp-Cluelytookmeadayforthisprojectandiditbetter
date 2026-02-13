import { DatabaseInit } from './DatabaseInit'

// ── Provider type constants ─────────────────────────────────────

export type TranscriptionProvider = 'openai-realtime' | 'deepgram'
export type LlmProvider =
  | 'openai-compatible'
  | 'openrouter'
  | 'groq'
  | 'together'
  | 'fireworks'
  | 'ollama'
  | 'kimi'
  | 'gemini'
  | 'glm'
  | 'deepseek'
  | 'mistral'
  | 'perplexity'
  | 'xai'
  | 'anthropic'

const DEFAULT_LLM_PROVIDER: LlmProvider = 'openai-compatible'

const LLM_DEFAULT_ENDPOINTS: Record<LlmProvider, string> = {
  'openai-compatible': 'https://api.openai.com/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  together: 'https://api.together.xyz/v1/chat/completions',
  fireworks: 'https://api.fireworks.ai/inference/v1/chat/completions',
  ollama: 'http://localhost:11434/v1/chat/completions',
  kimi: 'https://api.moonshot.cn/v1/chat/completions',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  glm: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  deepseek: 'https://api.deepseek.com/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
  perplexity: 'https://api.perplexity.ai/chat/completions',
  xai: 'https://api.x.ai/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages'
}

const LLM_DEFAULT_MODELS: Record<LlmProvider, string> = {
  'openai-compatible': 'gpt-4o',
  openrouter: 'openrouter/auto',
  groq: 'llama-3.3-70b-versatile',
  together: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
  fireworks: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
  ollama: 'llama3.1',
  kimi: 'moonshot-v1-8k',
  gemini: 'gemini-2.0-flash',
  glm: 'glm-4-plus',
  deepseek: 'deepseek-chat',
  mistral: 'mistral-large-latest',
  perplexity: 'sonar-pro',
  xai: 'grok-2-latest',
  anthropic: 'claude-sonnet-4-20250514'
}

const LLM_PROVIDER_ENV_API_KEYS: Partial<Record<LlmProvider, string[]>> = {
  openrouter: ['OPENROUTER_API_KEY'],
  groq: ['GROQ_API_KEY'],
  together: ['TOGETHER_API_KEY'],
  fireworks: ['FIREWORKS_API_KEY'],
  kimi: ['MOONSHOT_API_KEY', 'KIMI_API_KEY'],
  gemini: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
  glm: ['ZHIPU_API_KEY', 'GLM_API_KEY'],
  deepseek: ['DEEPSEEK_API_KEY'],
  mistral: ['MISTRAL_API_KEY'],
  perplexity: ['PERPLEXITY_API_KEY', 'PPLX_API_KEY'],
  xai: ['XAI_API_KEY', 'X_AI_API_KEY']
}

function isLlmProvider(value: string | null | undefined): value is LlmProvider {
  return Boolean(value) && value in LLM_DEFAULT_ENDPOINTS
}

function getFirstEnvValue(keys: string[] | undefined): string {
  if (!keys) return ''
  for (const key of keys) {
    const value = process.env[key]
    if (value) return value
  }
  return ''
}

export const TRANSCRIPTION_PROVIDERS: { id: TranscriptionProvider; label: string }[] = [
  { id: 'openai-realtime', label: 'OpenAI Realtime' },
  { id: 'deepgram', label: 'Deepgram' }
]

export const LLM_PROVIDERS: { id: LlmProvider; label: string }[] = [
  { id: 'openai-compatible', label: 'OpenAI / Compatible (custom endpoint)' },
  { id: 'openrouter', label: 'OpenRouter' },
  { id: 'groq', label: 'Groq' },
  { id: 'together', label: 'Together AI' },
  { id: 'fireworks', label: 'Fireworks AI' },
  { id: 'ollama', label: 'Ollama (local)' },
  { id: 'kimi', label: 'Kimi (Moonshot AI)' },
  { id: 'gemini', label: 'Google Gemini' },
  { id: 'glm', label: 'GLM (Zhipu AI)' },
  { id: 'deepseek', label: 'DeepSeek' },
  { id: 'mistral', label: 'Mistral AI' },
  { id: 'perplexity', label: 'Perplexity' },
  { id: 'xai', label: 'xAI (Grok)' },
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
    if (existing === null) {
      db.run('INSERT INTO AppSettings (Key, Value) VALUES (?, ?)', [key, value])
    } else {
      db.run('UPDATE AppSettings SET Value = ? WHERE Key = ?', [value, key])
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
    const provider = SettingsStore.get('llm_provider')
    return isLlmProvider(provider) ? provider : DEFAULT_LLM_PROVIDER
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

  static getLlmApiKey(providerOverride?: LlmProvider): string {
    const provider = providerOverride || SettingsStore.getLlmProvider()
    if (provider === 'anthropic') {
      return SettingsStore.get('anthropic_api_key') || process.env.ANTHROPIC_API_KEY || ''
    }

    if (provider !== 'openai-compatible') {
      const providerEnvKey = getFirstEnvValue(LLM_PROVIDER_ENV_API_KEYS[provider])
      if (providerEnvKey) return providerEnvKey
    }

    // Generic key can be reused across OpenAI-compatible providers.
    const genericKey = SettingsStore.get('llm_api_key') || process.env.LLM_API_KEY || ''
    if (genericKey) return genericKey

    if (provider === 'openai-compatible') {
      return SettingsStore.getOpenAiApiKey()
    }

    return ''
  }

  static getLlmModel(providerOverride?: LlmProvider): string {
    const provider = providerOverride || SettingsStore.getLlmProvider()
    return SettingsStore.get('llm_model') || process.env.LLM_MODEL || LLM_DEFAULT_MODELS[provider]
  }

  static getLlmEndpoint(providerOverride?: LlmProvider): string {
    const provider = providerOverride || SettingsStore.getLlmProvider()
    const endpoint = SettingsStore.get('llm_endpoint')
    if (endpoint) return endpoint

    // Preserve env override behavior for generic custom/OpenAI mode.
    if (provider === 'openai-compatible') {
      return process.env.LLM_ENDPOINT || LLM_DEFAULT_ENDPOINTS[provider]
    }
    return LLM_DEFAULT_ENDPOINTS[provider]
  }

  // ── Backward-compat alias used by IPC handler ───────────────

  static getApiKey(): string {
    return SettingsStore.getOpenAiApiKey()
  }
}
