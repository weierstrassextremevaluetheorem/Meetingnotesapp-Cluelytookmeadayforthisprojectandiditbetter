import { SettingsStore, type LlmProvider } from './SettingsStore'
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
 *  - openai-compatible: Any endpoint speaking OpenAI Chat Completions
 *  - anthropic: Anthropic Messages API (Claude)
 */
export class NotesService {
  async generateNotes(
    transcript: string,
    notesPrompt: string,
    config?: NotesConfig
  ): Promise<string> {
    const provider = (config?.providerOverride as LlmProvider) || SettingsStore.getLlmProvider()
    const model = config?.modelOverride || SettingsStore.getLlmModel()

    // Resolve endpoint based on the *effective* provider (after overrides),
    // not the global one, to avoid sending Anthropic requests to OpenAI URLs.
    let endpoint: string
    if (config?.endpointOverride) {
      endpoint = config.endpointOverride
    } else {
      // Use the effective provider to pick the correct default endpoint
      endpoint = provider === 'anthropic'
        ? (SettingsStore.get('llm_endpoint') || 'https://api.anthropic.com/v1/messages')
        : (SettingsStore.get('llm_endpoint') || process.env.LLM_ENDPOINT || 'https://api.openai.com/v1/chat/completions')
    }

    // Resolve API key based on effective provider
    let apiKey: string
    if (provider === 'anthropic') {
      apiKey = SettingsStore.get('anthropic_api_key') || process.env.ANTHROPIC_API_KEY || ''
    } else {
      apiKey = SettingsStore.getLlmApiKey()
    }

    if (!apiKey) {
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

    switch (provider) {
      case 'anthropic':
        return this.callAnthropic(apiKey, model, endpoint, enrichedPrompt, transcript)
      case 'openai-compatible':
      default:
        return this.callOpenAICompatible(apiKey, model, endpoint, enrichedPrompt, transcript)
    }
  }

  // ── OpenAI-compatible (works with dozens of providers) ─────

  private async callOpenAICompatible(
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

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
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
