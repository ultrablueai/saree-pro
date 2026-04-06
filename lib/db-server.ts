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
    get: (sql: string, params?: any[]) => {
      const stmt = database.prepare(sql);
      return stmt.get(...(params || []));
    },
    all: (sql: string, params?: any[]) => {
      const stmt = database.prepare(sql);
      return stmt.all(...(params || []));
    },
    run: (sql: string, params?: any[]) => {
      const stmt = database.prepare(sql);
      return stmt.run(...(params || []));
    }
  };
}
