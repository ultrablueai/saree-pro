import { BaseService } from '../shared/base-service'
import { Order, CreateOrderRequest, OrderItem, ServiceResponse } from '../shared/types'
import { cache } from '../../lib/redis'
import { DatabaseService } from '../shared/database'

export class OrderService extends BaseService {
  constructor() {
    super('order-service')
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy', details?: Record<string, unknown> }> {
    try {
      await DatabaseService.getOne('SELECT 1')
      const cacheHealthy = await cache.isHealthy()
      
      return {
        status: cacheHealthy ? 'healthy' : 'unhealthy',
        details: {
          database: 'connected',
          cache: cacheHealthy ? 'connected' : 'disconnected'
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  async createOrder(request: CreateOrderRequest): Promise<ServiceResponse<Order>> {
    return this.withErrorHandling(async () => {
      // Generate unique order code
      const orderCode = this.generateOrderCode()
      
      // Calculate total amount
      const subtotalAmount = request.items.reduce((sum, item) => {
        return sum + (item.unitPriceAmount * item.quantity)
      }, 0)
      
      const totalAmount = subtotalAmount + 10 // Add delivery fee for now

      // Create order
      const result = await DatabaseService.run(
        `INSERT INTO Order (
          orderCode, customerId, merchantId, deliveryAddressId, 
          status, paymentMethod, paymentStatus, subtotalAmount, 
          deliveryFeeAmount, totalAmount, currency, 
          estimatedDeliveryTime, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          orderCode,
          request.customerId,
          request.merchantId,
          request.deliveryAddress.id,
          'pending',
          request.paymentMethod,
          'unpaid',
          subtotalAmount,
          10, // delivery fee
          totalAmount,
          'SAR',
          new Date(Date.now() + 45 * 60 * 1000).toISOString() // 45 minutes from now
        ]
      )

      // Create order items
      for (const item of request.items) {
        await DatabaseService.run(
          `INSERT INTO OrderItem (
            orderId, menuItemId, menuItemName, quantity, 
            unitPriceAmount, totalPriceAmount, specialInstructions
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            result.lastID,
            item.menuItemId,
            `Menu Item ${item.menuItemId}`, // Temporary name
            item.quantity,
            item.unitPriceAmount,
            item.unitPriceAmount * item.quantity,
            item.specialInstructions
          ]
        )
      }

      // Get created order
      const order = await DatabaseService.getOne('SELECT * FROM Order WHERE id = ?', [result.lastID])

      // Cache order
      await cache.set(`order:${order.id}`, order, 3600)
      await cache.setUserOrders(request.customerId, [order])

      // Invalidate merchant cache
      await cache.invalidateMerchantCache(request.merchantId)

      this.log('info', 'Order created successfully', { 
        orderId: order.id, 
        orderCode: order.orderCode,
        customerId: request.customerId 
      })
      
      return this.mapToOrderType(order)
    })
  }

  async getOrderById(orderId: string): Promise<ServiceResponse<Order>> {
    return this.withErrorHandling(async () => {
      // Try cache first
      const cachedOrder = await cache.get(`order:${orderId}`)
      if (cachedOrder) {
        return cachedOrder as Order
      }

      // Get from database
      const order = await DatabaseService.getOne('SELECT * FROM Order WHERE id = ?', [orderId])

      if (!order) {
        throw new Error('Order not found')
      }

      // Cache the result
      await cache.set(`order:${orderId}`, order, 3600)

      return this.mapToOrderType(order)
    })
  }

  async getOrdersByCustomer(customerId: string, page: number = 1, limit: number = 20): Promise<ServiceResponse<{
    items: Order[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }>> {
    return this.withErrorHandling(async () => {
      const { offset, take, currentPage } = this.getPaginationParams(page, limit)

      const [orders, totalResult] = await Promise.all([
        DatabaseService.getAll(
          'SELECT * FROM Order WHERE customerId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?',
          [customerId, offset, take]
        ),
        DatabaseService.getOne('SELECT COUNT(*) as total FROM Order WHERE customerId = ?', [customerId])
      ])

      const total = totalResult?.total || 0
      const mappedOrders = orders.map((order) => this.mapToOrderType(order))

      return this.createPaginatedResponse(mappedOrders, total, currentPage, take).data!
    })
  }

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<ServiceResponse<Order>> {
    return this.withErrorHandling(async () => {
      const updateData: Record<string, unknown> = { status, updatedAt: new Date().toISOString() }
      
      if (status === 'confirmed') {
        updateData.confirmedAt = new Date().toISOString()
      } else if (status === 'delivered') {
        updateData.deliveredAt = new Date().toISOString()
      }

      await DatabaseService.run(
        `UPDATE Order SET status = ?, updatedAt = datetime('now') WHERE id = ?`,
        [status, orderId]
      )

      const order = await DatabaseService.getOne('SELECT * FROM Order WHERE id = ?', [orderId])

      // Invalidate cache
      await cache.invalidatePattern(`order:*`)
      
      this.log('info', 'Order status updated', { orderId, status })
      
      return this.mapToOrderType(order)
    })
  }

  async getOrdersByMerchant(merchantId: string, page: number = 1, limit: number = 20): Promise<ServiceResponse<{
    items: Order[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }>> {
    return this.withErrorHandling(async () => {
      const { offset, take, currentPage } = this.getPaginationParams(page, limit)

      const [orders, totalResult] = await Promise.all([
        DatabaseService.getAll(
          'SELECT * FROM Order WHERE merchantId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?',
          [merchantId, offset, take]
        ),
        DatabaseService.getOne('SELECT COUNT(*) as total FROM Order WHERE merchantId = ?', [merchantId])
      ])

      const total = totalResult?.total || 0
      const mappedOrders = orders.map((order) => this.mapToOrderType(order))

      return this.createPaginatedResponse(mappedOrders, total, currentPage, take).data!
    })
  }

  private generateOrderCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `ORD-${timestamp}-${random}`
  }

  private mapToOrderType(order: Record<string, unknown>): Order {
    return {
      id: order.id as string,
      orderCode: order.orderCode as string,
      customerId: order.customerId as string,
      merchantId: order.merchantId as string,
      driverId: order.driverId as string,
      status: order.status as Order['status'],
      totalAmount: Number(order.totalAmount),
      currency: order.currency as string,
      createdAt: order.createdAt as string,
      updatedAt: order.updatedAt as string
    }
  }
}

// Export singleton instance
export const orderService = new OrderService()
