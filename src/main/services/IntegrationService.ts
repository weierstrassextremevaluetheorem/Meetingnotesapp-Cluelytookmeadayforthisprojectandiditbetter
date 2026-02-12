import { SettingsStore } from './SettingsStore'

export interface IntegrationResult {
  success: boolean
  error?: string
  url?: string
}

/**
 * Handles one-click export integrations (Slack, Notion).
 */
export class IntegrationService {
  // ── Slack Webhook ────────────────────────────────────────────

  static async exportToSlack(
    title: string,
    notes: string,
    transcript?: string
  ): Promise<IntegrationResult> {
    const webhookUrl = SettingsStore.get('slack_webhook_url')
    if (!webhookUrl) {
      return { success: false, error: 'Slack webhook URL not configured. Go to Settings.' }
    }

    try {
      // Truncate for Slack's 3000-char block limit
      const truncatedNotes = notes.length > 2800 ? notes.slice(0, 2800) + '\n\n_...truncated_' : notes

      const blocks = [
        {
          type: 'header',
          text: { type: 'plain_text', text: `Meeting Notes: ${title}`, emoji: true }
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: truncatedNotes }
        }
      ]

      if (transcript) {
        const preview = transcript.length > 500 ? transcript.slice(0, 500) + '...' : transcript
        blocks.push({
          type: 'section',
          text: { type: 'mrkdwn', text: `*Transcript Preview:*\n${preview}` }
        })
      }

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks })
      })

      if (!res.ok) {
        const txt = await res.text()
        return { success: false, error: `Slack API error (${res.status}): ${txt}` }
      }

      console.log('[Integration] Slack export successful')
      return { success: true }
    } catch (err) {
      return { success: false, error: `Slack export failed: ${err}` }
    }
  }

  // ── Notion Page ──────────────────────────────────────────────

  static async exportToNotion(
    title: string,
    notes: string,
    date: string
  ): Promise<IntegrationResult> {
    const apiKey = SettingsStore.get('notion_api_key')
    const databaseId = SettingsStore.get('notion_database_id')

    if (!apiKey || !databaseId) {
      return { success: false, error: 'Notion API key or database ID not configured. Go to Settings.' }
    }

    try {
      // Convert markdown notes into Notion blocks (simplified - paragraph blocks)
      const paragraphs = notes.split('\n').filter((l) => l.trim())
      const children = paragraphs.slice(0, 100).map((line) => {
        // Headings
        if (line.startsWith('## ')) {
          return {
            object: 'block' as const,
            type: 'heading_2' as const,
            heading_2: {
              rich_text: [{ type: 'text' as const, text: { content: line.replace(/^##\s+/, '') } }]
            }
          }
        }
        if (line.startsWith('### ')) {
          return {
            object: 'block' as const,
            type: 'heading_3' as const,
            heading_3: {
              rich_text: [{ type: 'text' as const, text: { content: line.replace(/^###\s+/, '') } }]
            }
          }
        }
        // Bullet points
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return {
            object: 'block' as const,
            type: 'bulleted_list_item' as const,
            bulleted_list_item: {
              rich_text: [{ type: 'text' as const, text: { content: line.replace(/^[-*]\s+/, '') } }]
            }
          }
        }
        // Regular paragraph
        return {
          object: 'block' as const,
          type: 'paragraph' as const,
          paragraph: {
            rich_text: [{ type: 'text' as const, text: { content: line } }]
          }
        }
      })

      const res = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties: {
            Name: { title: [{ text: { content: title } }] },
            Date: { date: { start: date.split('T')[0] } }
          },
          children
        })
      })

      if (!res.ok) {
        const txt = await res.text()
        return { success: false, error: `Notion API error (${res.status}): ${txt}` }
      }

      const data = (await res.json()) as { url?: string }
      console.log('[Integration] Notion export successful')
      return { success: true, url: data.url }
    } catch (err) {
      return { success: false, error: `Notion export failed: ${err}` }
    }
  }
}
