import { DatabaseInit } from './DatabaseInit'
import { v4 as uuid } from 'uuid'

export interface TerminologyData {
  id: string
  term: string
  definition?: string | null
  createdAt: string
}

/**
 * Stores user-defined terminology (jargon, product names, people)
 * to improve transcription accuracy via prompt hints.
 */
export class TerminologyStore {
  static list(): TerminologyData[] {
    const db = DatabaseInit.getDb()
    const result = db.exec(
      'SELECT Id, Term, Definition, CreatedAt FROM Terminology ORDER BY Term'
    )
    if (result.length === 0) return []
    return result[0].values.map((row) => ({
      id: row[0] as string,
      term: row[1] as string,
      definition: (row[2] as string) || null,
      createdAt: row[3] as string
    }))
  }

  static add(term: string, definition?: string): TerminologyData {
    const db = DatabaseInit.getDb()
    const id = uuid()
    const now = new Date().toISOString()
    db.run(
      'INSERT OR IGNORE INTO Terminology (Id, Term, Definition, CreatedAt) VALUES (?, ?, ?, ?)',
      [id, term.trim(), definition?.trim() || null, now]
    )
    DatabaseInit.save()
    return { id, term: term.trim(), definition: definition?.trim() || null, createdAt: now }
  }

  static delete(id: string): boolean {
    const db = DatabaseInit.getDb()
    db.run('DELETE FROM Terminology WHERE Id = ?', [id])
    const changes = db.getRowsModified()
    DatabaseInit.save()
    return changes > 0
  }

  /** Build a comma-separated keyword list for transcription prompts */
  static getKeywordHints(): string {
    const terms = TerminologyStore.list()
    return terms.map((t) => t.term).join(', ')
  }
}
