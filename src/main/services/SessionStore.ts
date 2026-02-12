import { DatabaseInit } from './DatabaseInit'
import { v4 as uuid } from 'uuid'

export interface SessionData {
  id: string
  profileId: string
  profileName: string
  startedAt: string
  endedAt?: string
  transcriptText: string
  notesMarkdown?: string
  status: string
}

function rowToData(values: unknown[]): SessionData {
  return {
    id: values[0] as string,
    profileId: values[1] as string,
    profileName: values[2] as string,
    startedAt: values[3] as string,
    endedAt: (values[4] as string) || undefined,
    transcriptText: (values[5] as string) || '',
    notesMarkdown: (values[6] as string) || undefined,
    status: values[7] as string
  }
}

const SELECT_COLS = 'Id, ProfileId, ProfileName, StartedAt, EndedAt, TranscriptText, NotesMarkdown, Status'

export class SessionStore {
  static list(): SessionData[] {
    const db = DatabaseInit.getDb()
    const result = db.exec(`SELECT ${SELECT_COLS} FROM MeetingSessions ORDER BY StartedAt DESC`)
    if (result.length === 0) return []
    return result[0].values.map(rowToData)
  }

  static get(id: string): SessionData | null {
    const db = DatabaseInit.getDb()
    const stmt = db.prepare(`SELECT ${SELECT_COLS} FROM MeetingSessions WHERE Id = ?`)
    stmt.bind([id])
    if (stmt.step()) {
      const values = stmt.get()
      stmt.free()
      return rowToData(values)
    }
    stmt.free()
    return null
  }

  static create(profileId: string, profileName: string): SessionData {
    const db = DatabaseInit.getDb()
    const id = uuid()
    const now = new Date().toISOString()
    db.run(
      `INSERT INTO MeetingSessions (Id, ProfileId, ProfileName, StartedAt, TranscriptText, Status)
       VALUES (?, ?, ?, ?, '', 'recording')`,
      [id, profileId, profileName, now]
    )
    DatabaseInit.save()
    return SessionStore.get(id)!
  }

  static updateTranscript(id: string, transcript: string): void {
    const db = DatabaseInit.getDb()
    db.run('UPDATE MeetingSessions SET TranscriptText = ? WHERE Id = ?', [transcript, id])
    DatabaseInit.save()
  }

  static complete(id: string, notesMarkdown: string): void {
    const db = DatabaseInit.getDb()
    const now = new Date().toISOString()
    db.run(
      `UPDATE MeetingSessions SET EndedAt = ?, NotesMarkdown = ?, Status = 'completed' WHERE Id = ?`,
      [now, notesMarkdown, id]
    )
    DatabaseInit.save()
  }

  static fail(id: string): void {
    const db = DatabaseInit.getDb()
    const now = new Date().toISOString()
    db.run(
      `UPDATE MeetingSessions SET EndedAt = ?, Status = 'failed' WHERE Id = ?`,
      [now, id]
    )
    DatabaseInit.save()
  }

  static setGenerating(id: string): void {
    const db = DatabaseInit.getDb()
    db.run("UPDATE MeetingSessions SET Status = 'generating' WHERE Id = ?", [id])
    DatabaseInit.save()
  }

  static delete(id: string): boolean {
    const db = DatabaseInit.getDb()
    db.run('DELETE FROM MeetingSessions WHERE Id = ?', [id])
    const changes = db.getRowsModified()
    DatabaseInit.save()
    return changes > 0
  }
}
