import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import type { TerminologyEntry } from '../types'

// ── Provider constants (mirrored from backend) ──────────────

const TRANSCRIPTION_PROVIDERS = [
  { id: 'openai-realtime', label: 'OpenAI Realtime' },
  { id: 'deepgram', label: 'Deepgram' }
]

type LlmProviderId =
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

const LLM_PROVIDERS = [
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

const OPENAI_TRANSCRIPTION_MODELS = [
  'gpt-4o-transcribe', 'gpt-4o-mini-transcribe', 'whisper-1'
]
const DEEPGRAM_MODELS = ['nova-3', 'nova-2', 'nova', 'enhanced', 'base']

const OPENAI_LLM_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano']
const ANTHROPIC_MODELS = ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022']

const LLM_MODEL_SUGGESTIONS: Record<LlmProviderId, string[]> = {
  'openai-compatible': OPENAI_LLM_MODELS,
  openrouter: ['openrouter/auto', 'openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.3-70b-instruct'],
  groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  together: ['meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', 'Qwen/Qwen2.5-72B-Instruct-Turbo', 'deepseek-ai/DeepSeek-V3'],
  fireworks: ['accounts/fireworks/models/llama-v3p1-70b-instruct', 'accounts/fireworks/models/qwen2p5-72b-instruct', 'accounts/fireworks/models/mixtral-8x22b-instruct'],
  ollama: ['llama3.1', 'llama3.2', 'qwen2.5', 'mistral'],
  kimi: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  gemini: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro'],
  glm: ['glm-4-plus', 'glm-4-air', 'glm-4-flash'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  mistral: ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest'],
  perplexity: ['sonar-pro', 'sonar', 'sonar-reasoning-pro'],
  xai: ['grok-2-latest', 'grok-2-vision-latest', 'grok-beta'],
  anthropic: ANTHROPIC_MODELS
}

const DEFAULT_ENDPOINTS: Record<LlmProviderId, string> = {
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

const LLM_PROVIDER_HELP: Record<LlmProviderId, string> = {
  'openai-compatible': 'Use OpenAI directly, Azure OpenAI, or any provider that supports OpenAI chat completions.',
  openrouter: 'Preset endpoint for OpenRouter. Optional headers can be set via OPENROUTER_SITE_URL and OPENROUTER_APP_NAME.',
  groq: 'Preset endpoint for Groq OpenAI-compatible chat completions.',
  together: 'Preset endpoint for Together AI chat completions.',
  fireworks: 'Preset endpoint for Fireworks AI chat completions.',
  ollama: 'Local Ollama endpoint. API key is optional for local deployments.',
  kimi: 'Kimi (Moonshot AI) OpenAI-compatible endpoint.',
  gemini: 'Gemini via Google OpenAI-compatible endpoint. Usually uses GEMINI_API_KEY.',
  glm: 'GLM (Zhipu AI) OpenAI-compatible endpoint.',
  deepseek: 'DeepSeek endpoint supporting OpenAI-compatible chat completions.',
  mistral: 'Mistral AI endpoint supporting OpenAI-compatible chat completions.',
  perplexity: 'Perplexity endpoint supporting OpenAI-compatible chat completions.',
  xai: 'xAI Grok endpoint supporting OpenAI-compatible chat completions.',
  anthropic: 'Uses Anthropic Messages API (x-api-key + anthropic-version headers).'
}

const LLM_KEY_LABELS: Record<LlmProviderId, string> = {
  'openai-compatible': 'LLM API Key (optional if reusing OpenAI key)',
  openrouter: 'LLM API Key',
  groq: 'LLM API Key',
  together: 'LLM API Key',
  fireworks: 'LLM API Key',
  ollama: 'LLM API Key (optional for local Ollama)',
  kimi: 'LLM API Key',
  gemini: 'LLM API Key',
  glm: 'LLM API Key',
  deepseek: 'LLM API Key',
  mistral: 'LLM API Key',
  perplexity: 'LLM API Key',
  xai: 'LLM API Key',
  anthropic: 'Anthropic API Key'
}

const LLM_KEY_PLACEHOLDERS: Record<LlmProviderId, string> = {
  'openai-compatible': 'Leave blank to reuse OpenAI key',
  openrouter: 'Paste API key...',
  groq: 'Paste API key...',
  together: 'Paste API key...',
  fireworks: 'Paste API key...',
  ollama: 'Optional for local Ollama setups',
  kimi: 'Paste API key...',
  gemini: 'Paste API key...',
  glm: 'Paste API key...',
  deepseek: 'Paste API key...',
  mistral: 'Paste API key...',
  perplexity: 'Paste API key...',
  xai: 'Paste API key...',
  anthropic: 'Paste API key...'
}

function isLlmProvider(value: string | undefined): value is LlmProviderId {
  return Boolean(value) && value in DEFAULT_ENDPOINTS
}

// ── Component ───────────────────────────────────────────────

export function SettingsView() {
  const setView = useAppStore((s) => s.setView)
  const setToast = useAppStore((s) => s.setToast)

  // Provider selections
  const [transcriptionProvider, setTranscriptionProvider] = useState('openai-realtime')
  const [llmProvider, setLlmProvider] = useState('openai-compatible')

  // API keys
  const [openaiKey, setOpenaiKey] = useState('')
  const [openaiKeyMasked, setOpenaiKeyMasked] = useState('')
  const [deepgramKey, setDeepgramKey] = useState('')
  const [deepgramKeyMasked, setDeepgramKeyMasked] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [anthropicKeyMasked, setAnthropicKeyMasked] = useState('')
  const [llmKey, setLlmKey] = useState('')
  const [llmKeyMasked, setLlmKeyMasked] = useState('')

  // Models
  const [transcriptionModel, setTranscriptionModel] = useState('gpt-4o-transcribe')
  const [llmModel, setLlmModel] = useState('gpt-4o')
  const [llmEndpoint, setLlmEndpoint] = useState(DEFAULT_ENDPOINTS['openai-compatible'])

  // Integrations
  const [slackWebhook, setSlackWebhook] = useState('')
  const [slackWebhookMasked, setSlackWebhookMasked] = useState('')
  const [notionApiKey, setNotionApiKey] = useState('')
  const [notionApiKeyMasked, setNotionApiKeyMasked] = useState('')
  const [notionDbId, setNotionDbId] = useState('')

  // Retention
  const [retentionDays, setRetentionDays] = useState('')

  // Terminology
  const [terminology, setTerminology] = useState<TerminologyEntry[]>([])
  const [newTerm, setNewTerm] = useState('')
  const [newDef, setNewDef] = useState('')

  const [saved, setSaved] = useState(false)

  // ── Load ────────────────────────────────────────────────────

  const loadSettings = useCallback(async () => {
    if (!window.api) return
    const s = await window.api.getSettings()

    const savedLlmProvider = isLlmProvider(s.llm_provider) ? s.llm_provider : 'openai-compatible'

    setTranscriptionProvider(s.transcription_provider || 'openai-realtime')
    setLlmProvider(savedLlmProvider)
    setTranscriptionModel(s.transcription_model || 'gpt-4o-transcribe')
    setLlmModel(s.llm_model || LLM_MODEL_SUGGESTIONS[savedLlmProvider][0])
    setLlmEndpoint(s.llm_endpoint || DEFAULT_ENDPOINTS[savedLlmProvider])
    setRetentionDays(s.retention_days || '')
    setNotionDbId(s.notion_database_id || '')

    const mask = (k?: string) => k ? `${k.slice(0, 6)}...${k.slice(-4)}` : ''
    setOpenaiKeyMasked(mask(s.openai_api_key))
    setDeepgramKeyMasked(mask(s.deepgram_api_key))
    setAnthropicKeyMasked(mask(s.anthropic_api_key))
    setLlmKeyMasked(mask(s.llm_api_key))
    setSlackWebhookMasked(s.slack_webhook_url ? `...${s.slack_webhook_url.slice(-20)}` : '')
    setNotionApiKeyMasked(mask(s.notion_api_key))

    // Load terminology
    const terms = await window.api.listTerminology()
    setTerminology(terms)
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  const handleLlmProviderChange = (provider: string) => {
    const nextProvider = isLlmProvider(provider) ? provider : 'openai-compatible'
    setLlmProvider(nextProvider)
    setLlmEndpoint(DEFAULT_ENDPOINTS[nextProvider])
    setLlmModel(LLM_MODEL_SUGGESTIONS[nextProvider][0] || '')
  }

  const handleTranscriptionProviderChange = (provider: string) => {
    setTranscriptionProvider(provider)
    setTranscriptionModel(provider === 'deepgram' ? DEEPGRAM_MODELS[0] : OPENAI_TRANSCRIPTION_MODELS[0])
  }

  // ── Save ────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!window.api) return
    const set = window.api.setSetting

    await set('transcription_provider', transcriptionProvider)
    await set('llm_provider', llmProvider)
    await set('transcription_model', transcriptionModel)
    await set('llm_model', llmModel)
    await set('llm_endpoint', llmEndpoint)

    if (openaiKey.trim()) await set('openai_api_key', openaiKey.trim())
    if (deepgramKey.trim()) await set('deepgram_api_key', deepgramKey.trim())
    if (anthropicKey.trim()) await set('anthropic_api_key', anthropicKey.trim())
    if (llmKey.trim()) await set('llm_api_key', llmKey.trim())
    if (slackWebhook.trim()) await set('slack_webhook_url', slackWebhook.trim())
    if (notionApiKey.trim()) await set('notion_api_key', notionApiKey.trim())
    if (notionDbId.trim()) await set('notion_database_id', notionDbId.trim())
    if (retentionDays.trim()) await set('retention_days', retentionDays.trim())

    setSaved(true)
    setOpenaiKey(''); setDeepgramKey(''); setAnthropicKey(''); setLlmKey('')
    setSlackWebhook(''); setNotionApiKey('')
    await loadSettings()
    setTimeout(() => setSaved(false), 2000)
  }

  // ── Terminology handlers ────────────────────────────────────

  const handleAddTerm = async () => {
    if (!newTerm.trim()) return
    const result = await window.api.addTerminology(newTerm, newDef || undefined)
    if (result) {
      setTerminology([...terminology, result])
      setNewTerm('')
      setNewDef('')
    }
  }

  const handleDeleteTerm = async (id: string) => {
    await window.api.deleteTerminology(id)
    setTerminology(terminology.filter((t) => t.id !== id))
  }

  // ── Helpers ─────────────────────────────────────────────────

  const effectiveLlmProvider = isLlmProvider(llmProvider) ? llmProvider : 'openai-compatible'

  const showOpenAiKey = transcriptionProvider === 'openai-realtime' || effectiveLlmProvider === 'openai-compatible'
  const showDeepgramKey = transcriptionProvider === 'deepgram'
  const showAnthropicKey = effectiveLlmProvider === 'anthropic'
  const showLlmKey = effectiveLlmProvider !== 'anthropic'

  const transcriptionModels =
    transcriptionProvider === 'deepgram' ? DEEPGRAM_MODELS : OPENAI_TRANSCRIPTION_MODELS
  const llmModels = LLM_MODEL_SUGGESTIONS[effectiveLlmProvider] || OPENAI_LLM_MODELS

  const llmKeyLabel = LLM_KEY_LABELS[effectiveLlmProvider]
  const llmKeyPlaceholder = LLM_KEY_PLACEHOLDERS[effectiveLlmProvider]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
        <button onClick={() => setView('recording')} className="text-[10px] text-white/40 hover:text-white/70 transition-colors">&larr; Back</button>
        <span className="text-xs font-medium text-white/70">Settings</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">

        {/* ── TRANSCRIPTION PROVIDER ────────────────────────── */}
        <Section title="Transcription">
          <Label>Provider</Label>
          <Select value={transcriptionProvider} onChange={handleTranscriptionProviderChange} options={TRANSCRIPTION_PROVIDERS} aria-label="Transcription provider" />

          <Label>Model</Label>
          <Select value={transcriptionModel} onChange={setTranscriptionModel}
            options={transcriptionModels.map((m) => ({ id: m, label: m }))} aria-label="Transcription model" />

          {showOpenAiKey && (
            <KeyField label="OpenAI API Key" masked={openaiKeyMasked} value={openaiKey} onChange={setOpenaiKey} />
          )}
          {showDeepgramKey && (
            <KeyField label="Deepgram API Key" masked={deepgramKeyMasked} value={deepgramKey} onChange={setDeepgramKey} />
          )}
        </Section>

        {/* ── LLM / NOTES PROVIDER ─────────────────────────── */}
        <Section title="Notes Generation (LLM)">
          <Label>Provider</Label>
          <Select value={effectiveLlmProvider} onChange={handleLlmProviderChange} options={LLM_PROVIDERS} aria-label="LLM provider" />

          <Label>Model</Label>
          <ModelInput value={llmModel} onChange={setLlmModel} suggestions={llmModels} />

          <Label>Endpoint</Label>
          <input value={llmEndpoint} onChange={(e) => setLlmEndpoint(e.target.value)} className="input-field font-mono" aria-label="LLM endpoint" />

          {showAnthropicKey && (
            <KeyField label="Anthropic API Key" masked={anthropicKeyMasked} value={anthropicKey} onChange={setAnthropicKey} />
          )}

          {showLlmKey && (
            <KeyField label={llmKeyLabel} masked={llmKeyMasked} value={llmKey} onChange={setLlmKey} placeholder={llmKeyPlaceholder} />
          )}

          <p className="text-[10px] text-white/20 leading-relaxed mt-1">
            {LLM_PROVIDER_HELP[effectiveLlmProvider]}
          </p>
        </Section>

        {/* ── INTEGRATIONS ─────────────────────────────────── */}
        <Section title="Integrations">
          <KeyField label="Slack Webhook URL" masked={slackWebhookMasked} value={slackWebhook} onChange={setSlackWebhook} placeholder="https://hooks.slack.com/services/..." />

          <div className="border-t border-white/5 pt-2 mt-2" />

          <KeyField label="Notion API Key" masked={notionApiKeyMasked} value={notionApiKey} onChange={setNotionApiKey} placeholder="ntn_..." />

          <Label>Notion Database ID</Label>
          <input value={notionDbId} onChange={(e) => setNotionDbId(e.target.value)} placeholder="Database ID from Notion URL" className="input-field font-mono" aria-label="Notion database ID" />

          <p className="text-[10px] text-white/20 leading-relaxed mt-1">
            Create a Notion integration at notion.so/my-integrations, share a database with it,
            and paste the database ID. The database should have Name (title) and Date (date) properties.
          </p>
        </Section>

        {/* ── TERMINOLOGY ──────────────────────────────────── */}
        <Section title="Terminology / Glossary">
          <p className="text-[10px] text-white/30 leading-relaxed">
            Add product names, people, jargon, or abbreviations to improve transcription accuracy.
          </p>

          <div className="flex gap-1.5 mt-1">
            <input value={newTerm} onChange={(e) => setNewTerm(e.target.value)} placeholder="Term" className="input-field flex-1" aria-label="New term" />
            <input value={newDef} onChange={(e) => setNewDef(e.target.value)} placeholder="Definition (optional)" className="input-field flex-1" aria-label="Definition" />
            <button onClick={handleAddTerm} disabled={!newTerm.trim()} className="px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] hover:bg-emerald-500/30 transition-colors disabled:opacity-40">
              Add
            </button>
          </div>

          {terminology.length > 0 && (
            <div className="mt-1.5 space-y-0.5 max-h-28 overflow-y-auto">
              {terminology.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-1.5 py-0.5 rounded bg-white/3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/70 font-medium">{t.term}</span>
                    {t.definition && <span className="text-[9px] text-white/30">{t.definition}</span>}
                  </div>
                  <button onClick={() => handleDeleteTerm(t.id)} className="text-[9px] text-red-400/50 hover:text-red-400">x</button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── DATA RETENTION ───────────────────────────────── */}
        <Section title="Data Retention">
          <Label>Auto-delete sessions older than (days)</Label>
          <input value={retentionDays} onChange={(e) => setRetentionDays(e.target.value)} placeholder="Leave blank to keep forever" type="number" min="1" className="input-field" aria-label="Retention days" />
          <p className="text-[10px] text-white/20 leading-relaxed">Sessions older than this will be automatically deleted on app startup.</p>
        </Section>

        {/* Save */}
        <button onClick={handleSave}
          className={`w-full py-2 rounded-lg text-xs font-semibold transition-all border
            ${saved ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white/90'}`}>
          {saved ? 'Saved!' : 'Save Settings'}
        </button>

        <p className="text-[10px] text-white/20 leading-relaxed">
          All keys are stored locally on your machine and only sent to the selected providers.
        </p>
      </div>
    </div>
  )
}

// ── Reusable sub-components ─────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">{title}</h3>
      <div className="space-y-2 pl-0.5">{children}</div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[10px] text-white/40 block">{children}</label>
}

function Select({ value, onChange, options, ...rest }: {
  value: string
  onChange: (v: string) => void
  options: { id: string; label: string }[]
  [key: string]: unknown
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="input-field appearance-none" {...rest}>
      {options.map((o) => <option key={o.id} value={o.id} className="bg-gray-900 text-white">{o.label}</option>)}
    </select>
  )
}

function ModelInput({ value, onChange, suggestions }: {
  value: string; onChange: (v: string) => void; suggestions: string[]
}) {
  const isCustom = !suggestions.includes(value)
  return (
    <div className="space-y-1">
      <select
        value={isCustom ? '__custom__' : value}
        onChange={(e) => onChange(e.target.value === '__custom__' ? '' : e.target.value)}
        className="input-field appearance-none"
        aria-label="LLM model"
      >
        {suggestions.map((m) => <option key={m} value={m} className="bg-gray-900">{m}</option>)}
        <option value="__custom__" className="bg-gray-900">Custom...</option>
      </select>
      {isCustom && (
        <input value={value} onChange={(e) => onChange(e.target.value)}
          placeholder="Enter custom model name"
          className="input-field font-mono" aria-label="Custom model name" />
      )}
    </div>
  )
}

function KeyField({ label, masked, value, onChange, placeholder }: {
  label: string; masked: string; value: string
  onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] text-white/40 block">{label}</label>
      {masked ? (
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] text-emerald-400/80 font-mono">{masked}</span>
          <span className="text-[9px] text-emerald-400/40">Saved</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[9px] text-red-400/60">Not configured</span>
        </div>
      )}
      <input type="password" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || (masked ? 'Enter new key to update...' : 'Paste API key...')}
        className="input-field font-mono" aria-label={label} />
    </div>
  )
}
