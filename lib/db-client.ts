// Client-side database stub for Next.js
export const getDbExecutor = async () => {
  if (typeof window !== 'undefined') {
    // Client-side - return stub
    return {
      get: async () => null,
      all: async () => [],
      run: async () => ({ lastID: 0, changes: 0 })
    }
  }
  
  // Server-side - use actual database
  const { getDbExecutor } = await import('./db')
  return getDbExecutor()
}
