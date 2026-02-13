import { SettingsStore, LLM_PROVIDERS, type LlmProvider } from './SettingsStore'
import { TerminologyStore } from './TerminologyStore'

export interface NotesConfig {
  providerOverride?: string | null
  modelOverride?: string | null
  endpointOverride?: string | null
}

/**
 * Generates meeting notes by sending the transcript to an LLM.
 *
 * Supports per-profile LLM overrides and terminology injection.
 *
 * Providers:
 *  - openai-compatible and provider presets (OpenRouter, Groq, Together, Fireworks, Ollama,
 *    Kimi, Gemini, GLM, DeepSeek, Mistral, Perplexity, xAI)
 *  - anthropic: Anthropic Messages API (Claude)
 */
export class NotesService {
  async generateNotes(
    transcript: string,
    notesPrompt: string,
    config?: NotesConfig
  ): Promise<string> {
    const provider = this.resolveProvider(config?.providerOverride)
    const model = config?.modelOverride || SettingsStore.getLlmModel(provider)
    const endpoint = config?.endpointOverride || SettingsStore.getLlmEndpoint(provider)
    const apiKey = SettingsStore.getLlmApiKey(provider)

    if (!apiKey && this.requiresApiKey(provider, endpoint)) {
      throw new Error('LLM API key not set. Go to Settings to configure it.')
    }
    if (!transcript.trim()) {
      throw new Error('Transcript is empty')
    }

    // Inject terminology hints into system prompt
    const terminology = TerminologyStore.getKeywordHints()
    let enrichedPrompt = notesPrompt
    if (terminology) {
      enrichedPrompt += `\n\nKey terminology and names to recognize: ${terminology}`
    }

    console.log(`[Notes] provider=${provider}  model=${model}  endpoint=${endpoint}`)

    if (provider === 'anthropic') {
      return this.callAnthropic(apiKey, model, endpoint, enrichedPrompt, transcript)
    }
    return this.callOpenAICompatible(provider, apiKey, model, endpoint, enrichedPrompt, transcript)
  }

  private resolveProvider(providerOverride?: string | null): LlmProvider {
    if (!providerOverride) return SettingsStore.getLlmProvider()
    const validProvider = LLM_PROVIDERS.find((p) => p.id === providerOverride)?.id
    return validProvider || SettingsStore.getLlmProvider()
  }

  private requiresApiKey(provider: LlmProvider, endpoint: string): boolean {
    // Ollama and other localhost OpenAI-compatible backends often run without auth.
    if (provider === 'ollama') return false
    return !this.isLocalEndpoint(endpoint)
  }

  private isLocalEndpoint(endpoint: string): boolean {
    try {
      const url = new URL(endpoint)
      return ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
    } catch {
      return endpoint.startsWith('http://localhost') || endpoint.startsWith('http://127.0.0.1')
    }
  }

  // ── OpenAI-compatible (works with dozens of providers) ─────

  private async callOpenAICompatible(
    provider: LlmProvider,
    apiKey: string, model: string, endpoint: string,
    systemPrompt: string, transcript: string
  ): Promise<string> {
    const body = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here is the meeting transcript:\n\n${transcript}` }
      ],
      temperature: 0.3,
      max_tokens: 4096
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`
    }
    if (provider === 'openrouter') {
      const openRouterTitle = process.env.OPENROUTER_APP_NAME || process.env.OPENROUTER_TITLE
      const openRouterReferer = process.env.OPENROUTER_SITE_URL || process.env.OPENROUTER_REFERER
      if (openRouterTitle) headers['X-Title'] = openRouterTitle
      if (openRouterReferer) headers['HTTP-Referer'] = openRouterReferer
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`LLM API error (${res.status}): ${txt}`)
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('No content in LLM response')

    console.log('[Notes] OpenAI-compatible response OK')
    return content
  }

  // ── Anthropic Messages API ─────────────────────────────────

  private async callAnthropic(
    apiKey: string, model: string, endpoint: string,
    systemPrompt: string, transcript: string
  ): Promise<string> {
    const body = {
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: 'user', content: `Here is the meeting transcript:\n\n${transcript}` }
      ]
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`Anthropic API error (${res.status}): ${txt}`)
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>
    }
    const text = data.content?.find((b) => b.type === 'text')?.text
    if (!text) throw new Error('No text in Anthropic response')

    console.log('[Notes] Anthropic response OK')
    return text
  }
}
