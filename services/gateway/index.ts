import { NextRequest, NextResponse } from 'next/server'
import { CreateUserRequest, GatewayRequest, User } from '../shared/types'
import { userService } from '../user-service/fixed-index'
import { PerformanceMonitor, ErrorReporter } from '../../lib/monitoring'
import { MetricsCollector } from '../../lib/monitoring'

export class APIGateway {
  private routes = new Map<string, (req: GatewayRequest) => Promise<NextResponse>>()
  private rateLimitMap = new Map<string, { count: number, resetTime: number }>()

  constructor() {
    this.setupRoutes()
  }

  private setupRoutes() {
    // User routes
    this.routes.set('/api/users', this.handleUsers.bind(this))
    this.routes.set('/api/users/:id', this.handleUserById.bind(this))
    this.routes.set('/api/auth/login', this.handleLogin.bind(this))
    this.routes.set('/api/auth/register', this.handleRegister.bind(this))

    // Health check
    this.routes.set('/api/health', this.handleHealth.bind(this))
  }

  async handleRequest(req: NextRequest): Promise<NextResponse> {
    const startTime = Date.now()
    const pathname = new URL(req.url).pathname
    
    try {
      // Rate limiting
      const clientIp = req.ip || 'unknown'
      if (!this.checkRateLimit(clientIp)) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        )
      }

      // Find matching route
      const route = this.findRoute(pathname)
      if (!route) {
        return NextResponse.json(
          { error: 'Route not found' },
          { status: 404 }
        )
      }

      // Create gateway request
      const gatewayReq: GatewayRequest = {
        path: pathname,
        method: req.method,
        headers: Object.fromEntries(req.headers.entries()),
        body: req.method !== 'GET' ? await req.json().catch(() => null) : undefined,
        timestamp: new Date().toISOString()
      }

      // Handle request
      const response = await route(gatewayReq)

      // Record metrics
      const duration = Date.now() - startTime
      PerformanceMonitor.trackApiCall(pathname, duration, response.status)
      MetricsCollector.recordMetric(`gateway.${req.method.toLowerCase()}.${pathname}`, duration)

      return response

    } catch (error) {
      ErrorReporter.reportError(error as Error, { pathname, method: req.method })
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }

  private findRoute(pathname: string): ((req: GatewayRequest) => Promise<NextResponse>) | null {
    // Exact match first
    if (this.routes.has(pathname)) {
      return this.routes.get(pathname)!
    }

    // Pattern matching for dynamic routes
    for (const [route, handler] of this.routes.entries()) {
      if (this.isRouteMatch(route, pathname)) {
        return handler
      }
    }

    return null
  }

  private isRouteMatch(route: string, pathname: string): boolean {
    // Convert route pattern to regex
    const regexPattern = route
      .replace(/:[^/]+/g, '([^/]+)')
      .replace(/\//g, '\\/')

    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(pathname)
  }

  private checkRateLimit(clientIp: string): boolean {
    const now = Date.now()
    const windowMs = 15 * 60 * 1000 // 15 minutes
    const maxRequests = 100

    const current = this.rateLimitMap.get(clientIp)
    
    if (!current || now > current.resetTime) {
      this.rateLimitMap.set(clientIp, {
        count: 1,
        resetTime: now + windowMs
      })
      return true
    }

    if (current.count >= maxRequests) {
      return false
    }

    current.count++
    return true
  }

  private getObjectBody<T extends object>(body: unknown): T | null {
    if (body && typeof body === 'object') {
      return body as T
    }

    return null
  }

  // Route handlers
  private async handleUsers(req: GatewayRequest): Promise<NextResponse> {
    if (req.method === 'GET') {
      const { searchParams } = new URL(req.path, 'http://localhost')
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '20')
      const role = searchParams.get('role') || undefined

      const result = await userService.listUsers(page, limit, role)
      
      return NextResponse.json(result)
    }

    if (req.method === 'POST') {
      const body = this.getObjectBody<CreateUserRequest>(req.body)
      if (!body) {
        return NextResponse.json({ error: 'Invalid user payload' }, { status: 400 })
      }

      const result = await userService.createUser(body)
      
      return NextResponse.json(result, {
        status: result.success ? 201 : 400
      })
    }

    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  private async handleUserById(req: GatewayRequest): Promise<NextResponse> {
    const userId = this.extractParamFromPath(req.path, ':id')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    if (req.method === 'GET') {
      const result = await userService.getUserById(userId)
      
      return NextResponse.json(result, {
        status: result.success ? 200 : 404
      })
    }

    if (req.method === 'PUT') {
      const body = this.getObjectBody<Partial<User>>(req.body)
      if (!body) {
        return NextResponse.json({ error: 'Invalid user update payload' }, { status: 400 })
      }

      const result = await userService.updateUser(userId, body)
      
      return NextResponse.json(result, {
        status: result.success ? 200 : 400
      })
    }

    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  private async handleLogin(): Promise<NextResponse> {
    // TODO: Implement authentication
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
  }

  private async handleRegister(): Promise<NextResponse> {
    // TODO: Implement registration
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
  }

  private async handleHealth(): Promise<NextResponse> {
    const userHealth = await userService.healthCheck()
    
    return NextResponse.json({
      status: 'ok',
      gateway: 'healthy',
      services: {
        'user-service': userHealth
      },
      timestamp: new Date().toISOString()
    })
  }

  private extractParamFromPath(path: string, param: string): string | null {
    const parts = path.split('/')
    const paramIndex = parts.findIndex(part => part === param)
    
    return paramIndex !== -1 && paramIndex + 1 < parts.length 
      ? parts[paramIndex + 1] 
      : null
  }
}

// Export singleton instance
export const apiGateway = new APIGateway()

// Next.js middleware wrapper
export async function GET(req: NextRequest) {
  return apiGateway.handleRequest(req)
}

export async function POST(req: NextRequest) {
  return apiGateway.handleRequest(req)
}

export async function PUT(req: NextRequest) {
  return apiGateway.handleRequest(req)
}

export async function DELETE(req: NextRequest) {
  return apiGateway.handleRequest(req)
}
