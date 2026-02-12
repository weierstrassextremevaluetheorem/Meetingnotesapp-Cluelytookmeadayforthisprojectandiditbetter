import { SettingsStore, type LlmProvider } from './SettingsStore'

/**
 * Generates meeting notes by sending the transcript to an LLM.
 *
 * Supported providers:
 *  - openai-compatible: Any endpoint that speaks the OpenAI Chat Completions
 *    format (OpenAI, Azure OpenAI, Groq, Together AI, Fireworks, Ollama,
 *    LM Studio, vLLM, etc.)
 *  - anthropic: Anthropic Messages API (Claude)
 */
export class NotesService {
  async generateNotes(transcript: string, notesPrompt: string): Promise<string> {
    const provider = SettingsStore.getLlmProvider()
    const apiKey = SettingsStore.getLlmApiKey()
    const model = SettingsStore.getLlmModel()
    const endpoint = SettingsStore.getLlmEndpoint()

    if (!apiKey) {
      throw new Error('LLM API key not set. Go to Settings to configure it.')
    }
    if (!transcript.trim()) {
      throw new Error('Transcript is empty')
    }

    console.log(`[Notes] provider=${provider}  model=${model}  endpoint=${endpoint}`)

    switch (provider) {
      case 'anthropic':
        return this.callAnthropic(apiKey, model, endpoint, notesPrompt, transcript)
      case 'openai-compatible':
      default:
        return this.callOpenAICompatible(apiKey, model, endpoint, notesPrompt, transcript)
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
