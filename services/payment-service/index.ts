import { BaseService } from '../shared/base-service'
import { PaymentTransaction, CreatePaymentRequest, ServiceResponse } from '../shared/types'
import { cache } from '../../lib/redis'
import { DatabaseService } from '../shared/database'

export class PaymentService extends BaseService {
  constructor() {
    super('payment-service')
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

  async createPayment(request: CreatePaymentRequest): Promise<ServiceResponse<PaymentTransaction>> {
    return this.withErrorHandling(async () => {
      // Create payment transaction
      const result = await DatabaseService.run(
        `INSERT INTO PaymentTransaction (
          orderId, provider, providerRef, amount, currency, 
          status, paymentMethod, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          request.orderId,
          request.provider,
          null, // providerRef - will be set after payment processing
          request.amount,
          request.currency,
          'pending',
          request.paymentMethod
        ]
      )

      const transaction = await DatabaseService.getOne('SELECT * FROM PaymentTransaction WHERE id = ?', [result.lastID])

      // Cache transaction
      await cache.set(`payment:${transaction.id}`, transaction, 1800)

      this.log('info', 'Payment transaction created', { 
        transactionId: transaction.id, 
        orderId: request.orderId,
        amount: request.amount 
      })
      
      return this.mapToPaymentType(transaction)
    })
  }

  async processPayment(transactionId: string): Promise<ServiceResponse<PaymentTransaction>> {
    return this.withErrorHandling(async () => {
      const transaction = await DatabaseService.getOne('SELECT * FROM PaymentTransaction WHERE id = ?', [transactionId])

      if (!transaction) {
        throw new Error('Payment transaction not found')
      }

      if (transaction.status !== 'pending') {
        throw new Error('Payment already processed')
      }

      // Simulate payment processing
      const isSuccessful = await this.simulatePaymentProcessing()

      const newStatus = isSuccessful ? 'completed' : 'failed'
      const providerRef = isSuccessful ? `PROV_${Date.now()}` : null

      // Update transaction
      await DatabaseService.run(
        `UPDATE PaymentTransaction SET status = ?, providerRef = ?, processedAt = datetime('now'), updatedAt = datetime('now') WHERE id = ?`,
        [newStatus, providerRef, transactionId]
      )

      const updatedTransaction = await DatabaseService.getOne('SELECT * FROM PaymentTransaction WHERE id = ?', [transactionId])

      // Invalidate cache
      await cache.invalidatePattern(`payment:*`)

      // If payment successful, update order status
      if (isSuccessful) {
        await this.updateOrderPaymentStatus(transaction.orderId, 'paid')
      }

      this.log('info', 'Payment processed', { 
        transactionId, 
        status: newStatus,
        orderId: transaction.orderId 
      })
      
      return this.mapToPaymentType(updatedTransaction)
    })
  }

  async getPaymentById(transactionId: string): Promise<ServiceResponse<PaymentTransaction>> {
    return this.withErrorHandling(async () => {
      // Try cache first
      const cachedPayment = await cache.get(`payment:${transactionId}`)
      if (cachedPayment) {
        return cachedPayment as PaymentTransaction
      }

      // Get from database
      const transaction = await DatabaseService.getOne('SELECT * FROM PaymentTransaction WHERE id = ?', [transactionId])

      if (!transaction) {
        throw new Error('Payment transaction not found')
      }

      // Cache the result
      await cache.set(`payment:${transactionId}`, transaction, 1800)

      return this.mapToPaymentType(transaction)
    })
  }

  async getPaymentsByOrder(orderId: string): Promise<ServiceResponse<PaymentTransaction[]>> {
    return this.withErrorHandling(async () => {
      const transactions = await DatabaseService.getAll(
        'SELECT * FROM PaymentTransaction WHERE orderId = ? ORDER BY createdAt DESC',
        [orderId]
      )

      const mappedTransactions = transactions.map((transaction) => this.mapToPaymentType(transaction))

      return mappedTransactions
    })
  }

  async refundPayment(transactionId: string, reason?: string): Promise<ServiceResponse<PaymentTransaction>> {
    return this.withErrorHandling(async () => {
      const transaction = await DatabaseService.getOne('SELECT * FROM PaymentTransaction WHERE id = ?', [transactionId])

      if (!transaction) {
        throw new Error('Payment transaction not found')
      }

      if (transaction.status !== 'completed') {
        throw new Error('Cannot refund non-completed payment')
      }

      // Process refund
      const refundSuccessful = await this.processRefund()

      if (refundSuccessful) {
        await DatabaseService.run(
          `UPDATE PaymentTransaction SET status = 'refunded', updatedAt = datetime('now') WHERE id = ?`,
          [transactionId]
        )

        // Update order payment status
        await this.updateOrderPaymentStatus(transaction.orderId, 'refunded')
      }

      const updatedTransaction = await DatabaseService.getOne('SELECT * FROM PaymentTransaction WHERE id = ?', [transactionId])

      // Invalidate cache
      await cache.invalidatePattern(`payment:*`)

      this.log('info', 'Payment refunded', { transactionId, reason })
      
      return this.mapToPaymentType(updatedTransaction)
    })
  }

  async getPaymentStats(merchantId?: string, dateRange?: { start: string, end: string }): Promise<ServiceResponse<{
    totalRevenue: number
    totalTransactions: number
    successfulTransactions: number
    failedTransactions: number
    refundedTransactions: number
    averageTransactionValue: number
  }>> {
    return this.withErrorHandling(async () => {
      let whereClause = ''
      const params: (string | number | boolean | null)[] = []

      if (merchantId) {
        whereClause += ' WHERE o.merchantId = ?'
        params.push(merchantId)
      }

      if (dateRange) {
        whereClause += whereClause ? ' AND pt.createdAt BETWEEN ? AND ?' : ' WHERE pt.createdAt BETWEEN ? AND ?'
        params.push(dateRange.start, dateRange.end)
      }

      const stats = await DatabaseService.getOne(
        `SELECT 
          COUNT(*) as totalTransactions,
          SUM(CASE WHEN pt.status = 'completed' THEN pt.amount ELSE 0 END) as totalRevenue,
          SUM(CASE WHEN pt.status = 'completed' THEN 1 ELSE 0 END) as successfulTransactions,
          SUM(CASE WHEN pt.status = 'failed' THEN 1 ELSE 0 END) as failedTransactions,
          SUM(CASE WHEN pt.status = 'refunded' THEN 1 ELSE 0 END) as refundedTransactions,
          AVG(CASE WHEN pt.status = 'completed' THEN pt.amount ELSE NULL END) as averageTransactionValue
         FROM PaymentTransaction pt
         JOIN Order o ON pt.orderId = o.id
         ${whereClause}`,
        params
      )

      return {
        totalRevenue: Number(stats?.totalRevenue) || 0,
        totalTransactions: Number(stats?.totalTransactions) || 0,
        successfulTransactions: Number(stats?.successfulTransactions) || 0,
        failedTransactions: Number(stats?.failedTransactions) || 0,
        refundedTransactions: Number(stats?.refundedTransactions) || 0,
        averageTransactionValue: Number(stats?.averageTransactionValue) || 0
      }
    })
  }

  private async simulatePaymentProcessing(): Promise<boolean> {
    // Simulate payment gateway processing
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 90% success rate for simulation
    return Math.random() > 0.1
  }

  private async processRefund(): Promise<boolean> {
    // Simulate refund processing
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 95% success rate for refunds
    return Math.random() > 0.05
  }

  private async updateOrderPaymentStatus(orderId: string, paymentStatus: string): Promise<void> {
    await DatabaseService.run(
      'UPDATE Order SET paymentStatus = ?, updatedAt = datetime("now") WHERE id = ?',
      [paymentStatus, orderId]
    )
  }

  private generateTransactionId(): string {
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `TXN-${timestamp}-${random}`
  }

  private mapToPaymentType(transaction: Record<string, unknown>): PaymentTransaction {
    return {
      id: transaction.id as string,
      orderId: transaction.orderId as string,
      provider: transaction.provider as string,
      providerRef: transaction.providerRef as string,
      amount: Number(transaction.amount),
      currency: transaction.currency as string,
      status: transaction.status as PaymentTransaction['status'],
      processedAt: transaction.processedAt as string,
      createdAt: transaction.createdAt as string
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService()
