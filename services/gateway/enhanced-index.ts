import { NextRequest, NextResponse } from 'next/server'
import { GatewayRequest } from '../shared/types'
import { userService } from '../user-service/fixed-index'
import { orderService } from '../order-service/index'
import { merchantService } from '../merchant-service/index'
import { paymentService } from '../payment-service/index'
import { notificationService } from '../notification-service/index'
import { PerformanceMonitor, ErrorReporter } from '../../lib/monitoring'
import { MetricsCollector } from '../../lib/monitoring'

export class EnhancedAPIGateway {
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

    // Order routes
    this.routes.set('/api/orders', this.handleOrders.bind(this))
    this.routes.set('/api/orders/:id', this.handleOrderById.bind(this))
    this.routes.set('/api/orders/customer/:customerId', this.handleCustomerOrders.bind(this))
    this.routes.set('/api/orders/merchant/:merchantId', this.handleMerchantOrders.bind(this))

    // Merchant routes
    this.routes.set('/api/merchants', this.handleMerchants.bind(this))
    this.routes.set('/api/merchants/:id', this.handleMerchantById.bind(this))
    this.routes.set('/api/merchants/:id/menu', this.handleMerchantMenu.bind(this))

    // Payment routes
    this.routes.set('/api/payments', this.handlePayments.bind(this))
    this.routes.set('/api/payments/:id', this.handlePaymentById.bind(this))
    this.routes.set('/api/payments/:id/process', this.handleProcessPayment.bind(this))
    this.routes.set('/api/payments/:id/refund', this.handleRefundPayment.bind(this))

    // Notification routes
    this.routes.set('/api/notifications', this.handleNotifications.bind(this))
    this.routes.set('/api/notifications/:id/read', this.handleMarkAsRead.bind(this))
    this.routes.set('/api/notifications/unread/:userId', this.handleUnreadCount.bind(this))

    // Health check
    this.routes.set('/api/health', this.handleHealth.bind(this))
    this.routes.set('/api/health/detailed', this.handleDetailedHealth.bind(this))
  }

  async handleRequest(req: NextRequest): Promise<NextResponse> {
    const startTime = Date.now()
    const pathname = new URL(req.url).pathname
    
    try {
      // Rate limiting
      const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
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
      MetricsCollector.recordMetric(`gateway.${req.method?.toLowerCase()}.${pathname}`, duration)

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

  // User route handlers
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
      const result = await userService.createUser(req.body as any)
      
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
      const result = await userService.updateUser(userId, req.body as any)
      
      return NextResponse.json(result, {
        status: result.success ? 200 : 400
      })
    }

    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  // Order route handlers
  private async handleOrders(req: GatewayRequest): Promise<NextResponse> {
    if (req.method === 'POST') {
      const result = await orderService.createOrder(req.body as any)
      
      return NextResponse.json(result, {
        status: result.success ? 201 : 400
      })
    }

    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  private async handleOrderById(req: GatewayRequest): Promise<NextResponse> {
    const orderId = this.extractParamFromPath(req.path, ':id')
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    if (req.method === 'GET') {
      const result = await orderService.getOrderById(orderId)
      
      return NextResponse.json(result, {
        status: result.success ? 200 : 404
      })
    }

    if (req.method === 'PUT') {
      const { status } = req.body as any
      const result = await orderService.updateOrderStatus(orderId, status)
      
      return NextResponse.json(result, {
        status: result.success ? 200 : 400
      })
    }

    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  // Merchant route handlers
  private async handleMerchants(req: GatewayRequest): Promise<NextResponse> {
    if (req.method === 'GET') {
      const { searchParams } = new URL(req.path, 'http://localhost')
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '20')
      const status = searchParams.get('status') || undefined

      const result = await merchantService.listMerchants(page, limit, status)
      
      return NextResponse.json(result)
    }

    if (req.method === 'POST') {
      const result = await merchantService.createMerchant(req.body as any)
      
      return NextResponse.json(result, {
        status: result.success ? 201 : 400
      })
    }

    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  private async handleMerchantById(req: GatewayRequest): Promise<NextResponse> {
    const merchantId = this.extractParamFromPath(req.path, ':id')
    
    if (!merchantId) {
      return NextResponse.json({ error: 'Merchant ID required' }, { status: 400 })
    }

    if (req.method === 'GET') {
      const result = await merchantService.getMerchantById(merchantId)
      
      return NextResponse.json(result, {
        status: result.success ? 200 : 404
      })
    }

    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  private async handleMerchantMenu(req: GatewayRequest): Promise<NextResponse> {
    const merchantId = this.extractParamFromPath(req.path, ':id')
    
    if (!merchantId) {
      return NextResponse.json({ error: 'Merchant ID required' }, { status: 400 })
    }

    if (req.method === 'GET') {
      const result = await merchantService.getMerchantMenu(merchantId)
      
      return NextResponse.json(result, {
        status: result.success ? 200 : 404
      })
    }

    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  // Health check handlers
  private async handleHealth(req: GatewayRequest): Promise<NextResponse> {
    const [userHealth, orderHealth, merchantHealth, paymentHealth, notificationHealth] = await Promise.all([
      userService.healthCheck(),
      orderService.healthCheck(),
      merchantService.healthCheck(),
      paymentService.healthCheck(),
      notificationService.healthCheck()
    ])
    
    return NextResponse.json({
      status: 'ok',
      gateway: 'healthy',
      services: {
        'user-service': userHealth,
        'order-service': orderHealth,
        'merchant-service': merchantHealth,
        'payment-service': paymentHealth,
        'notification-service': notificationHealth
      },
      timestamp: new Date().toISOString()
    })
  }

  private async handleDetailedHealth(req: GatewayRequest): Promise<NextResponse> {
    return NextResponse.json({
      gateway: {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        routes: this.routes.size,
        rateLimitEntries: this.rateLimitMap.size
      },
      timestamp: new Date().toISOString()
    })
  }

  // Placeholder handlers for other routes
  private async handleLogin(req: GatewayRequest): Promise<NextResponse> {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
  }

  private async handleRegister(req: GatewayRequest): Promise<NextResponse> {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
  }

  private async handleCustomerOrders(req: GatewayRequest): Promise<NextResponse> {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
  }

  private async handleMerchantOrders(req: GatewayRequest): Promise<NextResponse> {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
  }

  private async handlePayments(req: GatewayRequest): Promise<NextResponse> {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
  }

  private async handlePaymentById(req: GatewayRequest): Promise<NextResponse> {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
  }

  private async handleProcessPayment(req: GatewayRequest): Promise<NextResponse> {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
  }

  private async handleRefundPayment(req: GatewayRequest): Promise<NextResponse> {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
  }

  private async handleNotifications(req: GatewayRequest): Promise<NextResponse> {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
  }

  private async handleMarkAsRead(req: GatewayRequest): Promise<NextResponse> {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
  }

  private async handleUnreadCount(req: GatewayRequest): Promise<NextResponse> {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
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
export const enhancedApiGateway = new EnhancedAPIGateway()

// Next.js middleware wrapper
export async function GET(req: NextRequest) {
  return enhancedApiGateway.handleRequest(req)
}

export async function POST(req: NextRequest) {
  return enhancedApiGateway.handleRequest(req)
}

export async function PUT(req: NextRequest) {
  return enhancedApiGateway.handleRequest(req)
}

export async function DELETE(req: NextRequest) {
  return enhancedApiGateway.handleRequest(req)
}
