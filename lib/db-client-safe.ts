// Client-safe database utilities
// This file provides stub implementations for client-side usage

export function getDbExecutor() {
  // Return stub implementation for client-side
  if (typeof window !== 'undefined') {
    return {
      get: async () => null,
      all: async () => [],
      run: async () => ({ lastID: 0, changes: 0 })
    };
  }
  
  // Import server-side implementation
  return require('./db-server').getDbExecutor();
}

export function ensureDatabaseReady(): boolean {
  if (typeof window !== 'undefined') {
    return false; // Client-side cannot access database
  }
  
  try {
    return require('./db-server').ensureDatabaseReady();
  } catch {
    return false;
  }
}
