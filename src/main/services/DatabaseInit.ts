import initSqlJs, { Database } from 'sql.js'
import { join } from 'path'
import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { v4 as uuid } from 'uuid'

let db: Database | null = null
let dbPath = ''

export class DatabaseInit {
  static getDbPath(): string {
    const dataDir = join(app.getPath('userData'), 'data')
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true })
    }
    return join(dataDir, 'meetings.db')
  }

  static getDb(): Database {
    if (!db) {
      throw new Error('Database not initialized. Call DatabaseInit.initialize() first.')
    }
    return db
  }

  static async initialize(): Promise<void> {
    dbPath = DatabaseInit.getDbPath()

    const SQL = await initSqlJs()

    // Load existing database or create new
    if (existsSync(dbPath)) {
      const fileBuffer = readFileSync(dbPath)
      db = new SQL.Database(fileBuffer)
    } else {
      db = new SQL.Database()
    }

    db.run(`
      CREATE TABLE IF NOT EXISTS PromptProfiles (
        Id TEXT PRIMARY KEY,
        Name TEXT NOT NULL,
        TranscriptionPrompt TEXT DEFAULT '',
        NotesPrompt TEXT NOT NULL,
        OutputFormat TEXT NOT NULL DEFAULT 'markdown',
        CreatedAt TEXT NOT NULL,
        UpdatedAt TEXT NOT NULL
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS MeetingSessions (
        Id TEXT PRIMARY KEY,
        ProfileId TEXT NOT NULL,
        ProfileName TEXT NOT NULL,
        StartedAt TEXT NOT NULL,
        EndedAt TEXT,
        TranscriptText TEXT DEFAULT '',
        NotesMarkdown TEXT,
        Status TEXT NOT NULL DEFAULT 'recording',
        FOREIGN KEY (ProfileId) REFERENCES PromptProfiles(Id)
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS AppSettings (
        Key TEXT PRIMARY KEY,
        Value TEXT NOT NULL
      )
    `)

    // Seed default profile if none exist
    const result = db.exec('SELECT COUNT(*) as cnt FROM PromptProfiles')
    const count = result.length > 0 ? result[0].values[0][0] as number : 0

    if (count === 0) {
      const now = new Date().toISOString()
      db.run(
        `INSERT INTO PromptProfiles (Id, Name, TranscriptionPrompt, NotesPrompt, OutputFormat, CreatedAt, UpdatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uuid(),
          'General Meeting',
          '',
          'You are a meeting notes assistant. Given the transcript below, produce structured Markdown notes with these sections: ## Summary, ## Key Discussion Points, ## Action Items, ## Decisions Made, ## Follow-ups. Be concise and factual. Use bullet points.',
          'markdown',
          now,
          now
        ]
      )
      console.log('[DB] Seeded default "General Meeting" profile.')
    }

    DatabaseInit.save()
    console.log('[DB] Database initialized at', dbPath)
  }

  static save(): void {
    if (!db || !dbPath) return
    const data = db.export()
    const buffer = Buffer.from(data)
    writeFileSync(dbPath, buffer)
  }
}
