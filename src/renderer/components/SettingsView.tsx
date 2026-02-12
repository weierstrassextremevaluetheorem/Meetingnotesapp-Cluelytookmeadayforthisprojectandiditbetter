import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'

// ── Provider constants (mirrored from backend) ──────────────

const TRANSCRIPTION_PROVIDERS = [
  { id: 'openai-realtime', label: 'OpenAI Realtime' },
  { id: 'deepgram', label: 'Deepgram' }
]

const LLM_PROVIDERS = [
  { id: 'openai-compatible', label: 'OpenAI-Compatible' },
  { id: 'anthropic', label: 'Anthropic Claude' }
]

const OPENAI_TRANSCRIPTION_MODELS = [
  'gpt-4o-transcribe', 'gpt-4o-mini-transcribe', 'whisper-1'
]
const DEEPGRAM_MODELS = ['nova-3', 'nova-2', 'nova', 'enhanced', 'base']

const OPENAI_LLM_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano']
const ANTHROPIC_MODELS = ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022']

const DEFAULT_ENDPOINTS: Record<string, string> = {
  'openai-compatible': 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages'
}

// ── Component ───────────────────────────────────────────────

export function SettingsView() {
  const setView = useAppStore((s) => s.setView)

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

  const [saved, setSaved] = useState(false)

  // ── Load ────────────────────────────────────────────────────

  const loadSettings = useCallback(async () => {
    if (!window.api) return
    const s = await window.api.getSettings()

    setTranscriptionProvider(s.transcription_provider || 'openai-realtime')
    setLlmProvider(s.llm_provider || 'openai-compatible')
    setTranscriptionModel(s.transcription_model || 'gpt-4o-transcribe')
    setLlmModel(s.llm_model || 'gpt-4o')
    setLlmEndpoint(s.llm_endpoint || DEFAULT_ENDPOINTS[s.llm_provider || 'openai-compatible'])

    // Mask saved keys
    const mask = (k?: string) => k ? `${k.slice(0, 6)}...${k.slice(-4)}` : ''
    setOpenaiKeyMasked(mask(s.openai_api_key))
    setDeepgramKeyMasked(mask(s.deepgram_api_key))
    setAnthropicKeyMasked(mask(s.anthropic_api_key))
    setLlmKeyMasked(mask(s.llm_api_key))
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  // When LLM provider changes, update endpoint + model defaults
  useEffect(() => {
    setLlmEndpoint(DEFAULT_ENDPOINTS[llmProvider] || DEFAULT_ENDPOINTS['openai-compatible'])
    setLlmModel(llmProvider === 'anthropic' ? ANTHROPIC_MODELS[0] : OPENAI_LLM_MODELS[0])
  }, [llmProvider])

  useEffect(() => {
    const p = transcriptionProvider
    setTranscriptionModel(p === 'deepgram' ? 'nova-3' : 'gpt-4o-transcribe')
  }, [transcriptionProvider])

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

    setSaved(true)
    setOpenaiKey(''); setDeepgramKey(''); setAnthropicKey(''); setLlmKey('')
    await loadSettings()
    setTimeout(() => setSaved(false), 2000)
  }

  // ── Helpers ─────────────────────────────────────────────────

  const showOpenAiKey = transcriptionProvider === 'openai-realtime' || llmProvider === 'openai-compatible'
  const showDeepgramKey = transcriptionProvider === 'deepgram'
  const showAnthropicKey = llmProvider === 'anthropic'
  const showLlmKey = llmProvider === 'openai-compatible' // separate LLM key for non-OpenAI compatible endpoints

  const transcriptionModels =
    transcriptionProvider === 'deepgram' ? DEEPGRAM_MODELS : OPENAI_TRANSCRIPTION_MODELS
  const llmModels =
    llmProvider === 'anthropic' ? ANTHROPIC_MODELS : OPENAI_LLM_MODELS

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
          <Select value={transcriptionProvider} onChange={setTranscriptionProvider} options={TRANSCRIPTION_PROVIDERS} aria-label="Transcription provider" />

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
          <Select value={llmProvider} onChange={setLlmProvider} options={LLM_PROVIDERS} aria-label="LLM provider" />

          <Label>Model</Label>
          <ModelInput value={llmModel} onChange={setLlmModel} suggestions={llmModels} />

          <Label>Endpoint</Label>
          <input value={llmEndpoint} onChange={(e) => setLlmEndpoint(e.target.value)} className="input-field font-mono" aria-label="LLM endpoint" />

          {showAnthropicKey && (
            <KeyField label="Anthropic API Key" masked={anthropicKeyMasked} value={anthropicKey} onChange={setAnthropicKey} />
          )}

          {showLlmKey && (
            <KeyField
              label="LLM API Key (if different from OpenAI key)"
              masked={llmKeyMasked}
              value={llmKey}
              onChange={setLlmKey}
              placeholder="Leave blank to reuse OpenAI key"
            />
          )}

          {llmProvider === 'openai-compatible' && (
            <p className="text-[10px] text-white/20 leading-relaxed mt-1">
              Works with OpenAI, Azure OpenAI, Groq, Together AI, Fireworks,
              Ollama (http://localhost:11434/v1/chat/completions), LM Studio, vLLM, and any
              provider that supports the OpenAI chat completions format.
            </p>
          )}
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
