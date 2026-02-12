import initSqlJs, { Database } from 'sql.js'
import { join } from 'node:path'
import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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

    // ── Core tables ──────────────────────────────────────────

    db.run(`
      CREATE TABLE IF NOT EXISTS PromptProfiles (
        Id TEXT PRIMARY KEY,
        Name TEXT NOT NULL,
        TranscriptionPrompt TEXT DEFAULT '',
        NotesPrompt TEXT NOT NULL,
        OutputFormat TEXT NOT NULL DEFAULT 'markdown',
        LlmProviderOverride TEXT,
        LlmModelOverride TEXT,
        LlmEndpointOverride TEXT,
        CreatedAt TEXT NOT NULL,
        UpdatedAt TEXT NOT NULL
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS MeetingSessions (
        Id TEXT PRIMARY KEY,
        ProfileId TEXT NOT NULL,
        ProfileName TEXT NOT NULL,
        Title TEXT,
        StartedAt TEXT NOT NULL,
        EndedAt TEXT,
        TranscriptText TEXT DEFAULT '',
        NotesMarkdown TEXT,
        Status TEXT NOT NULL DEFAULT 'recording',
        FeedbackRating INTEGER,
        FeedbackText TEXT,
        FOREIGN KEY (ProfileId) REFERENCES PromptProfiles(Id)
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS AppSettings (
        Key TEXT PRIMARY KEY,
        Value TEXT NOT NULL
      )
    `)

    // ── New tables for Phase 1 features ──────────────────────

    db.run(`
      CREATE TABLE IF NOT EXISTS AuditLog (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        Timestamp TEXT NOT NULL,
        Action TEXT NOT NULL,
        Resource TEXT NOT NULL,
        ResourceId TEXT,
        Details TEXT
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS Terminology (
        Id TEXT PRIMARY KEY,
        Term TEXT NOT NULL UNIQUE,
        Definition TEXT,
        CreatedAt TEXT NOT NULL
      )
    `)

    // ── Migrations for existing databases ────────────────────

    DatabaseInit.runMigrations()

    // ── Seed default profiles if none exist ──────────────────

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
          'You are a meeting notes assistant. Given the transcript below, produce structured Markdown notes with these sections:\n\n## Summary\nA 2-3 sentence overview of the meeting.\n\n## Key Discussion Points\nBullet points of the main topics discussed.\n\n## Decisions Made\nBullet points of any decisions reached.\n\n## Action Items\nFor each action item, include:\n- **Task**: What needs to be done\n- **Owner**: Who is responsible (if mentioned)\n- **Due Date**: When it\'s due (if mentioned)\n\n## Follow-ups\nItems that need further discussion or attention.\n\nBe concise and factual. Use bullet points. Extract concrete action items with owners when possible.',
          'markdown',
          now,
          now
        ]
      )

      db.run(
        `INSERT INTO PromptProfiles (Id, Name, TranscriptionPrompt, NotesPrompt, OutputFormat, CreatedAt, UpdatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uuid(),
          'Engineering Standup',
          'sprint, blocker, PR, deploy, release, staging, production',
          'You are a standup meeting notes assistant for an engineering team. Structure the notes as:\n\n## Summary\n1-2 sentences on the standup.\n\n## Updates by Person\nGroup updates by speaker (if identifiable). For each person:\n- **Yesterday**: What they completed\n- **Today**: What they plan to work on\n- **Blockers**: Any blockers mentioned\n\n## Action Items\n- **Task**: description\n- **Owner**: who\n- **Due Date**: when (if mentioned)\n\n## Blockers & Risks\nList any blockers, risks, or dependencies called out.\n\nBe concise. Use bullet points.',
          'markdown',
          now,
          now
        ]
      )

      db.run(
        `INSERT INTO PromptProfiles (Id, Name, TranscriptionPrompt, NotesPrompt, OutputFormat, CreatedAt, UpdatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uuid(),
          'Sales Call',
          'pricing, contract, deal, pipeline, objection, demo, proposal, close',
          'You are a sales call notes assistant. Structure the notes as:\n\n## Call Summary\n2-3 sentences on the call outcome and prospect sentiment.\n\n## Prospect Information\n- Company, role, and names mentioned\n- Current pain points and needs\n\n## Key Discussion Points\nBullet points of main topics.\n\n## Objections & Concerns\nAny pushback or concerns raised by the prospect.\n\n## Action Items\n- **Task**: description\n- **Owner**: who (sales rep or prospect)\n- **Due Date**: when\n\n## Next Steps\nAgreed follow-up actions and timeline.\n\n## Deal Signals\n- Buying signals (positive indicators)\n- Risk signals (concerns or blockers)\n\nBe concise and factual.',
          'markdown',
          now,
          now
        ]
      )

      console.log('[DB] Seeded default profiles: General Meeting, Engineering Standup, Sales Call.')
    }

    DatabaseInit.save()
    console.log('[DB] Database initialized at', dbPath)
  }

  /** Run schema migrations for existing databases */
  private static runMigrations(): void {
    if (!db) return

    const hasColumn = (table: string, column: string): boolean => {
      const info = db!.exec(`PRAGMA table_info(${table})`)
      if (info.length === 0) return false
      return info[0].values.some((row) => row[1] === column)
    }

    // PromptProfiles migrations
    if (!hasColumn('PromptProfiles', 'LlmProviderOverride')) {
      db.run('ALTER TABLE PromptProfiles ADD COLUMN LlmProviderOverride TEXT')
    }
    if (!hasColumn('PromptProfiles', 'LlmModelOverride')) {
      db.run('ALTER TABLE PromptProfiles ADD COLUMN LlmModelOverride TEXT')
    }
    if (!hasColumn('PromptProfiles', 'LlmEndpointOverride')) {
      db.run('ALTER TABLE PromptProfiles ADD COLUMN LlmEndpointOverride TEXT')
    }

    // MeetingSessions migrations
    if (!hasColumn('MeetingSessions', 'Title')) {
      db.run('ALTER TABLE MeetingSessions ADD COLUMN Title TEXT')
    }
    if (!hasColumn('MeetingSessions', 'FeedbackRating')) {
      db.run('ALTER TABLE MeetingSessions ADD COLUMN FeedbackRating INTEGER')
    }
    if (!hasColumn('MeetingSessions', 'FeedbackText')) {
      db.run('ALTER TABLE MeetingSessions ADD COLUMN FeedbackText TEXT')
    }
  }

  static save(): void {
    if (!db || !dbPath) return
    const data = db.export()
    const buffer = Buffer.from(data)
    writeFileSync(dbPath, buffer)
  }
}
