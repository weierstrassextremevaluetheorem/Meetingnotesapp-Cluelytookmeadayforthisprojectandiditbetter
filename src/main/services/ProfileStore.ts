import { DatabaseInit } from './DatabaseInit'
import { v4 as uuid } from 'uuid'

export interface PromptProfileData {
  id: string
  name: string
  transcriptionPrompt: string
  notesPrompt: string
  outputFormat: string
  llmProviderOverride?: string | null
  llmModelOverride?: string | null
  llmEndpointOverride?: string | null
  createdAt: string
  updatedAt: string
}

const SELECT_COLS =
  'Id, Name, TranscriptionPrompt, NotesPrompt, OutputFormat, LlmProviderOverride, LlmModelOverride, LlmEndpointOverride, CreatedAt, UpdatedAt'

function rowToData(values: unknown[]): PromptProfileData {
  return {
    id: values[0] as string,
    name: values[1] as string,
    transcriptionPrompt: (values[2] as string) || '',
    notesPrompt: values[3] as string,
    outputFormat: values[4] as string,
    llmProviderOverride: (values[5] as string) || null,
    llmModelOverride: (values[6] as string) || null,
    llmEndpointOverride: (values[7] as string) || null,
    createdAt: values[8] as string,
    updatedAt: values[9] as string
  }
}

export class ProfileStore {
  static list(): PromptProfileData[] {
    const db = DatabaseInit.getDb()
    const result = db.exec(`SELECT ${SELECT_COLS} FROM PromptProfiles ORDER BY Name`)
    if (result.length === 0) return []
    return result[0].values.map(rowToData)
  }

  static get(id: string): PromptProfileData | null {
    const db = DatabaseInit.getDb()
    const stmt = db.prepare(`SELECT ${SELECT_COLS} FROM PromptProfiles WHERE Id = ?`)
    stmt.bind([id])
    if (stmt.step()) {
      const values = stmt.get()
      stmt.free()
      return rowToData(values)
    }
    stmt.free()
    return null
  }

  static create(data: {
    name: string
    transcriptionPrompt: string
    notesPrompt: string
    outputFormat?: string
    llmProviderOverride?: string | null
    llmModelOverride?: string | null
    llmEndpointOverride?: string | null
  }): PromptProfileData {
    const db = DatabaseInit.getDb()
    const now = new Date().toISOString()
    const id = uuid()
    db.run(
      `INSERT INTO PromptProfiles (Id, Name, TranscriptionPrompt, NotesPrompt, OutputFormat, LlmProviderOverride, LlmModelOverride, LlmEndpointOverride, CreatedAt, UpdatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.transcriptionPrompt,
        data.notesPrompt,
        data.outputFormat || 'markdown',
        data.llmProviderOverride || null,
        data.llmModelOverride || null,
        data.llmEndpointOverride || null,
        now,
        now
      ]
    )
    DatabaseInit.save()
    return ProfileStore.get(id)!
  }

  static update(id: string, data: {
    name?: string
    transcriptionPrompt?: string
    notesPrompt?: string
    outputFormat?: string
    llmProviderOverride?: string | null
    llmModelOverride?: string | null
    llmEndpointOverride?: string | null
  }): PromptProfileData | null {
    const existing = ProfileStore.get(id)
    if (!existing) return null

    const db = DatabaseInit.getDb()
    const now = new Date().toISOString()
    db.run(
      `UPDATE PromptProfiles
       SET Name = ?, TranscriptionPrompt = ?, NotesPrompt = ?, OutputFormat = ?,
           LlmProviderOverride = ?, LlmModelOverride = ?, LlmEndpointOverride = ?, UpdatedAt = ?
       WHERE Id = ?`,
      [
        data.name ?? existing.name,
        data.transcriptionPrompt ?? existing.transcriptionPrompt,
        data.notesPrompt ?? existing.notesPrompt,
        data.outputFormat ?? existing.outputFormat,
        (data.llmProviderOverride !== undefined ? data.llmProviderOverride : existing.llmProviderOverride) ?? null,
        (data.llmModelOverride !== undefined ? data.llmModelOverride : existing.llmModelOverride) ?? null,
        (data.llmEndpointOverride !== undefined ? data.llmEndpointOverride : existing.llmEndpointOverride) ?? null,
        now,
        id
      ]
    )
    DatabaseInit.save()
    return ProfileStore.get(id)
  }

  static delete(id: string): boolean {
    const db = DatabaseInit.getDb()
    db.run('DELETE FROM PromptProfiles WHERE Id = ?', [id])
    const changes = db.getRowsModified()
    DatabaseInit.save()
    return changes > 0
  }
}
