import { DatabaseInit } from './DatabaseInit'
import { v4 as uuid } from 'uuid'

export interface PromptProfileData {
  id: string
  name: string
  transcriptionPrompt: string
  notesPrompt: string
  outputFormat: string
  createdAt: string
  updatedAt: string
}

function rowToData(values: unknown[]): PromptProfileData {
  return {
    id: values[0] as string,
    name: values[1] as string,
    transcriptionPrompt: (values[2] as string) || '',
    notesPrompt: values[3] as string,
    outputFormat: values[4] as string,
    createdAt: values[5] as string,
    updatedAt: values[6] as string
  }
}

export class ProfileStore {
  static list(): PromptProfileData[] {
    const db = DatabaseInit.getDb()
    const result = db.exec('SELECT Id, Name, TranscriptionPrompt, NotesPrompt, OutputFormat, CreatedAt, UpdatedAt FROM PromptProfiles ORDER BY Name')
    if (result.length === 0) return []
    return result[0].values.map(rowToData)
  }

  static get(id: string): PromptProfileData | null {
    const db = DatabaseInit.getDb()
    const stmt = db.prepare('SELECT Id, Name, TranscriptionPrompt, NotesPrompt, OutputFormat, CreatedAt, UpdatedAt FROM PromptProfiles WHERE Id = ?')
    stmt.bind([id])
    if (stmt.step()) {
      const values = stmt.get()
      stmt.free()
      return rowToData(values)
    }
    stmt.free()
    return null
  }

  static create(data: { name: string; transcriptionPrompt: string; notesPrompt: string; outputFormat?: string }): PromptProfileData {
    const db = DatabaseInit.getDb()
    const now = new Date().toISOString()
    const id = uuid()
    db.run(
      `INSERT INTO PromptProfiles (Id, Name, TranscriptionPrompt, NotesPrompt, OutputFormat, CreatedAt, UpdatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.transcriptionPrompt, data.notesPrompt, data.outputFormat || 'markdown', now, now]
    )
    DatabaseInit.save()
    return ProfileStore.get(id)!
  }

  static update(id: string, data: { name?: string; transcriptionPrompt?: string; notesPrompt?: string; outputFormat?: string }): PromptProfileData | null {
    const existing = ProfileStore.get(id)
    if (!existing) return null

    const db = DatabaseInit.getDb()
    const now = new Date().toISOString()
    db.run(
      `UPDATE PromptProfiles
       SET Name = ?, TranscriptionPrompt = ?, NotesPrompt = ?, OutputFormat = ?, UpdatedAt = ?
       WHERE Id = ?`,
      [
        data.name ?? existing.name,
        data.transcriptionPrompt ?? existing.transcriptionPrompt,
        data.notesPrompt ?? existing.notesPrompt,
        data.outputFormat ?? existing.outputFormat,
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
