import { getDbExecutor } from '../../lib/db'

// Database helper for microservices
export class DatabaseService {
  static async getOne<T = Record<string, unknown>>(query: string, params: (string | number | boolean | null)[] = []): Promise<T | null> {
    const db = await getDbExecutor()
    return db.get(query, params) as Promise<T | null>
  }

  static async getAll<T = Record<string, unknown>>(query: string, params: (string | number | boolean | null)[] = []): Promise<T[]> {
    const db = await getDbExecutor()
    return db.all(query, params) as Promise<T[]>
  }

  static async run(query: string, params: (string | number | boolean | null)[] = []): Promise<{ lastID: number, changes: number }> {
    const db = await getDbExecutor()
    const result = await db.run(query, params)
    return result as { lastID: number, changes: number }
  }

  static async count(table: string, whereClause = '', params: (string | number | boolean | null)[] = []): Promise<number> {
    const query = `SELECT COUNT(*) as total FROM ${table} ${whereClause}`
    const result = await this.getOne<{ total: number }>(query, params)
    return result?.total || 0
  }

  static async exists(table: string, idField: string, value: string | number | boolean | null): Promise<boolean> {
    const query = `SELECT 1 FROM ${table} WHERE ${idField} = ? LIMIT 1`
    const result = await this.getOne(query, [value])
    return result !== null
  }
}
