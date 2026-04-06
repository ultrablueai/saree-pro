import * as Sentry from '@sentry/nextjs'

// Initialize Sentry for error tracking
export function initSentry() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN || '',
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    debug: process.env.NODE_ENV === 'development',
    
    // Performance monitoring
    integrations: [
      new Sentry.fsIntegration.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app: undefined }),
    ],
    
    beforeSend(event) {
      // Filter out sensitive data
      if (event.request?.cookies) {
        delete event.request.cookies
      }
      return event
    }
  })
}

// Performance monitoring utilities
export class PerformanceMonitor {
  static trackApiCall(endpoint: string, duration: number, statusCode: number) {
    Sentry.addBreadcrumb({
      message: `API Call: ${endpoint}`,
      category: 'api',
      level: statusCode < 400 ? 'info' : 'error',
      data: {
        endpoint,
        duration,
        statusCode
      }
    })
  }

  static trackDatabaseQuery(query: string, duration: number) {
    Sentry.addBreadcrumb({
      message: `DB Query: ${query.substring(0, 100)}`,
      category: 'database',
      level: 'info',
      data: {
        query: query.substring(0, 100),
        duration
      }
    })
  }

  static trackCacheOperation(operation: string, key: string, hit: boolean) {
    Sentry.addBreadcrumb({
      message: `Cache ${operation}: ${key}`,
      category: 'cache',
      level: 'info',
      data: {
        operation,
        key,
        hit
      }
    })
  }

  static trackUserAction(action: string, userId?: string) {
    Sentry.addBreadcrumb({
      message: `User Action: ${action}`,
      category: 'user',
      level: 'info',
      data: {
        action,
        userId
      }
    })
  }
}

// Health check utilities
export class HealthChecker {
  static checks: Array<{ name: string, check: () => Promise<boolean> }> = []

  static addCheck(name: string, check: () => Promise<boolean>) {
    this.checks.push({ name, check })
  }

  static async runAllChecks(): Promise<{ status: 'healthy' | 'unhealthy', checks: Array<{ name: string, status: boolean, error?: string }> }> {
    const results = await Promise.allSettled(
      this.checks.map(async ({ name, check }) => ({
        name,
        status: await check(),
        error: undefined
      }))
    )

    const checks = results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          name: 'unknown',
          status: false,
          error: result.reason?.message || 'Unknown error'
        }
      }
    })

    const allHealthy = checks.every(check => check.status)

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks
    }
  }
}

// Metrics collection
export class MetricsCollector {
  private static metrics = new Map<string, number[]>()

  static recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    
    const values = this.metrics.get(name)!
    values.push(value)
    
    // Keep only last 100 values to prevent memory leak
    if (values.length > 100) {
      values.shift()
    }
  }

  static getMetricStats(name: string) {
    const values = this.metrics.get(name) || []
    if (values.length === 0) return null

    const sorted = [...values].sort((a, b) => a - b)
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    }
  }

  static getAllMetrics() {
    const result: Record<string, ReturnType<typeof this.getMetricStats>> = {}
    for (const [name] of this.metrics) {
      result[name] = this.getMetricStats(name)
    }
    return result
  }
}

// Error boundary for React components
export class ErrorReporter {
  static reportError(error: Error, context?: Record<string, unknown>) {
    Sentry.captureException(error, {
      contexts: { custom: context }
    })
  }

  static reportMessage(message: string, level: Sentry.SeverityLevel = 'info') {
    Sentry.captureMessage(message, level)
  }
}

// API response time middleware
export function createPerformanceMiddleware() {
  return (req: {path: string, method: string}, res: {on: (event: string, callback: () => void) => void, statusCode: number}, next: () => void) => {
    const start = Date.now()
    
    res.on('finish', () => {
      const duration = Date.now() - start
      PerformanceMonitor.trackApiCall(req.path, duration, res.statusCode)
      MetricsCollector.recordMetric(`api.${req.method.toLowerCase()}.${req.path}`, duration)
    })
    
    next()
  }
}

// Database performance wrapper
export function withDatabaseTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  queryName: string
): T {
  return (async (...args: Parameters<T>) => {
    const start = Date.now()
    try {
      const result = await fn(...args)
      const duration = Date.now() - start
      PerformanceMonitor.trackDatabaseQuery(queryName, duration)
      MetricsCollector.recordMetric(`db.${queryName}`, duration)
      return result
    } catch (error) {
      const duration = Date.now() - start
      PerformanceMonitor.trackDatabaseQuery(queryName, duration)
      ErrorReporter.reportError(error as Error, { queryName, args })
      throw error
    }
  }) as T
}
