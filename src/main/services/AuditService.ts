import { DatabaseInit } from './DatabaseInit'

export interface AuditEntry {
  id: number
  timestamp: string
  action: string
  resource: string
  resourceId?: string
  details?: string
}

/**
 * Structured audit logging for security-relevant events.
 * Logs to SQLite for local inspection and future cloud sync.
 */
export class AuditService {
  static log(action: string, resource: string, resourceId?: string, details?: string): void {
    try {
      const db = DatabaseInit.getDb()
      const now = new Date().toISOString()
      db.run(
        `INSERT INTO AuditLog (Timestamp, Action, Resource, ResourceId, Details)
         VALUES (?, ?, ?, ?, ?)`,
        [now, action, resource, resourceId || null, details || null]
      )
      DatabaseInit.save()
    } catch {
      // Audit logging should never crash the app
      console.error('[Audit] Failed to write audit log')
    }
  }

  static list(limit = 100): AuditEntry[] {
    const db = DatabaseInit.getDb()
    const result = db.exec(
      `SELECT Id, Timestamp, Action, Resource, ResourceId, Details
       FROM AuditLog ORDER BY Id DESC LIMIT ${limit}`
    )
    if (result.length === 0) return []
    return result[0].values.map((row) => ({
      id: row[0] as number,
      timestamp: row[1] as string,
      action: row[2] as string,
      resource: row[3] as string,
      resourceId: (row[4] as string) || undefined,
      details: (row[5] as string) || undefined
    }))
  }
}
