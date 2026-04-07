// Server-side database utilities only
import Database from 'better-sqlite3';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database('./dev.db');
  }
  return db;
}

export function ensureDatabaseReady(): boolean {
  try {
    getDatabase();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

export function getDbExecutor() {
  const database = getDatabase();
  
  return {
    get: <T>(sql: string, params?: unknown[]) => {
      const stmt = database.prepare(sql);
      return stmt.get(...(params || [])) as T | undefined;
    },
    all: <T>(sql: string, params?: unknown[]) => {
      const stmt = database.prepare(sql);
      return stmt.all(...(params || [])) as T[];
    },
    run: (sql: string, params?: unknown[]) => {
      const stmt = database.prepare(sql);
      return stmt.run(...(params || []));
    }
  };
}
