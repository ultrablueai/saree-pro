// Client-safe database utilities
// This file provides stub implementations for client-side usage

export async function getDbExecutor() {
  if (typeof window !== 'undefined') {
    return {
      get: async () => null,
      all: async () => [],
      run: async () => ({ lastID: 0, changes: 0 }),
    };
  }

  const serverDb = await import('./db-server');
  return serverDb.getDbExecutor();
}

export async function ensureDatabaseReady(): Promise<boolean> {
  if (typeof window !== 'undefined') {
    return false;
  }

  try {
    const serverDb = await import('./db-server');
    return serverDb.ensureDatabaseReady();
  } catch {
    return false;
  }
}
