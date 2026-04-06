import { ServiceResponse, ServiceRequest } from './types'

export abstract class BaseService {
  protected serviceName: string

  constructor(serviceName: string) {
    this.serviceName = serviceName
  }

  // Standard response creation
  protected createResponse<T>(data?: T, error?: string): ServiceResponse<T> {
    return {
      success: !error,
      data,
      error,
      timestamp: new Date().toISOString(),
      service: this.serviceName
    }
  }

  // Standard error handling
  protected handleError(error: unknown): ServiceResponse<never> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error(`[${this.serviceName}] Error:`, errorMessage, error)
    
    return {
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
      service: this.serviceName
    }
  }

  // Request validation
  protected validateRequest<T>(request: ServiceRequest, requiredFields: (keyof T)[]): { isValid: boolean, missingFields: string[] } {
    const missingFields: string[] = []
    
    for (const field of requiredFields) {
      if (!(field in request)) {
        missingFields.push(field.toString())
      }
    }

    return {
      isValid: missingFields.length === 0,
      missingFields
    }
  }

  // Async operation wrapper with error handling
  protected async withErrorHandling<T>(
    operation: () => Promise<T>
  ): Promise<ServiceResponse<T>> {
    try {
      const result = await operation()
      return this.createResponse(result)
    } catch (error) {
      return this.handleError(error)
    }
  }

  // Service health check
  abstract healthCheck(): Promise<{ status: 'healthy' | 'unhealthy', details?: Record<string, unknown> }>

  // Metrics collection
  protected recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    // This will be implemented with actual metrics collection
    console.log(`[${this.serviceName}] Metric: ${name} = ${value}`, tags || {})
  }

  // Logging
  protected log(level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      level,
      message,
      ...meta
    }
    
    console.log(JSON.stringify(logEntry))
  }

  // Cache key generation
  protected generateCacheKey(...parts: string[]): string {
    return `${this.serviceName}:${parts.join(':')}`
  }

  // Rate limiting check
  protected async checkRateLimit(
    identifier: string, 
    limit: number, 
    windowMs: number
  ): Promise<{ allowed: boolean, remaining: number, resetTime: number }> {
    // This will be implemented with Redis
    const now = Date.now()
    
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: now + windowMs
    }
  }

  // Input sanitization
  protected sanitizeInput(input: unknown): unknown {
    if (typeof input === 'string') {
      return input.trim().replace(/[<>]/g, '')
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item))
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value)
      }
      return sanitized
    }
    
    return input
  }

  // Pagination helper
  protected getPaginationParams(
    page?: number, 
    limit?: number
  ): { offset: number, take: number, currentPage: number } {
    const currentPage = Math.max(1, page || 1)
    const take = Math.min(100, Math.max(1, limit || 20))
    const offset = (currentPage - 1) * take

    return { offset, take, currentPage }
  }

  // Response pagination
  protected createPaginatedResponse<T>(
    data: T[],
    total: number,
    currentPage: number,
    take: number
  ): ServiceResponse<{
    items: T[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    const totalPages = Math.ceil(total / take)
    
    return this.createResponse({
      items: data,
      pagination: {
        total,
        page: currentPage,
        limit: take,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1
      }
    })
  }
}
