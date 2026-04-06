import { BaseService } from '../shared/base-service'
import { Notification, SendNotificationRequest, ServiceResponse } from '../shared/types'
import { cache } from '../../lib/redis'
import { DatabaseService } from '../shared/database'

export class NotificationService extends BaseService {
  constructor() {
    super('notification-service')
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

  async sendNotification(request: SendNotificationRequest): Promise<ServiceResponse<Notification>> {
    return this.withErrorHandling(async () => {
      // Create notification record
      const result = await DatabaseService.run(
        `INSERT INTO Notification (
          userId, title, message, type, isRead, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          request.userId,
          request.title,
          request.message,
          request.type,
          false
        ]
      )

      const notification = await DatabaseService.getOne('SELECT * FROM Notification WHERE id = ?', [result.lastID])

      // Send through requested channels
      const deliveryResults = await this.sendThroughChannels(request, notification)

      // Cache recent notifications for user
      await this.cacheUserNotifications(request.userId)

      this.log('info', 'Notification sent', { 
        notificationId: notification.id,
        userId: request.userId,
        channels: request.channels,
        deliveryResults
      })
      
      return this.mapToNotificationType(notification)
    })
  }

  async getUserNotifications(userId: string, page: number = 1, limit: number = 20, unreadOnly?: boolean): Promise<ServiceResponse<{
    items: Notification[]
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

      let whereClause = 'WHERE userId = ?'
      let params: (string | number | boolean | null)[] = [userId, offset, take]
      
      if (unreadOnly) {
        whereClause += ' AND isRead = 0'
        params = [userId, offset, take]
      }

      const [notifications, totalResult] = await Promise.all([
        DatabaseService.getAll(
          `SELECT * FROM Notification ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
          params
        ),
        DatabaseService.getOne(`SELECT COUNT(*) as total FROM Notification ${whereClause}`, [userId])
      ])

      const total = totalResult?.total || 0
      const mappedNotifications = notifications.map((notification) => this.mapToNotificationType(notification))

      return this.createPaginatedResponse(mappedNotifications, total, currentPage, take).data!
    })
  }

  async markAsRead(notificationId: string, userId: string): Promise<ServiceResponse<boolean>> {
    return this.withErrorHandling(async () => {
      // Verify notification belongs to user
      const notification = await DatabaseService.getOne(
        'SELECT * FROM Notification WHERE id = ? AND userId = ?',
        [notificationId, userId]
      )

      if (!notification) {
        throw new Error('Notification not found')
      }

      await DatabaseService.run(
        'UPDATE Notification SET isRead = 1, updatedAt = datetime("now") WHERE id = ?',
        [notificationId]
      )

      // Invalidate user notifications cache
      await cache.invalidatePattern(`notifications:${userId}:*`)

      this.log('info', 'Notification marked as read', { notificationId, userId })
      
      return true
    })
  }

  async markAllAsRead(userId: string): Promise<ServiceResponse<number>> {
    return this.withErrorHandling(async () => {
      const result = await DatabaseService.run(
        'UPDATE Notification SET isRead = 1, updatedAt = datetime("now") WHERE userId = ? AND isRead = 0',
        [userId]
      )

      // Invalidate user notifications cache
      await cache.invalidatePattern(`notifications:${userId}:*`)

      this.log('info', 'All notifications marked as read', { userId, count: result.changes })
      
      return result.changes
    })
  }

  async getUnreadCount(userId: string): Promise<ServiceResponse<number>> {
    return this.withErrorHandling(async () => {
      // Try cache first
      const cachedCount = await cache.get(`notifications:${userId}:unread_count`)
      if (cachedCount !== null) {
        return cachedCount as number
      }

      const result = await DatabaseService.getOne(
        'SELECT COUNT(*) as count FROM Notification WHERE userId = ? AND isRead = 0',
        [userId]
      )

      const count = result?.count || 0

      // Cache for 5 minutes
      await cache.set(`notifications:${userId}:unread_count`, count, 300)

      return count
    })
  }

  async deleteNotification(notificationId: string, userId: string): Promise<ServiceResponse<boolean>> {
    return this.withErrorHandling(async () => {
      // Verify notification belongs to user
      const notification = await DatabaseService.getOne(
        'SELECT * FROM Notification WHERE id = ? AND userId = ?',
        [notificationId, userId]
      )

      if (!notification) {
        throw new Error('Notification not found')
      }

      await DatabaseService.run('DELETE FROM Notification WHERE id = ?', [notificationId])

      // Invalidate user notifications cache
      await cache.invalidatePattern(`notifications:${userId}:*`)

      this.log('info', 'Notification deleted', { notificationId, userId })
      
      return true
    })
  }

  async sendBulkNotifications(userIds: string[], request: Omit<SendNotificationRequest, 'userId'>): Promise<ServiceResponse<Notification[]>> {
    return this.withErrorHandling(async () => {
      const notifications: Notification[] = []

      for (const userId of userIds) {
        try {
          const result = await this.sendNotification({
            ...request,
            userId
          })

          if (result.success && result.data) {
            notifications.push(result.data)
          }
        } catch (error) {
          this.log('error', `Failed to send notification to user ${userId}`, { error })
        }
      }

      this.log('info', 'Bulk notifications sent', { 
        totalUsers: userIds.length,
        successful: notifications.length
      })

      return notifications
    })
  }

  private async sendThroughChannels(request: SendNotificationRequest, notification: Record<string, unknown>): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {}

    for (const channel of request.channels) {
      try {
        switch (channel) {
          case 'push':
            results.push = await this.sendPushNotification(notification)
            break
          case 'email':
            results.email = await this.sendEmailNotification(notification)
            break
          case 'sms':
            results.sms = await this.sendSMSNotification(notification)
            break
        }
      } catch (error) {
        this.log('error', `Failed to send ${channel} notification`, { error })
        results[channel] = false
      }
    }

    return results
  }

  private async sendPushNotification(notification: Record<string, unknown>): Promise<boolean> {
    // Simulate push notification
    this.log('info', 'Push notification sent', { notificationId: notification.id })
    return true
  }

  private async sendEmailNotification(notification: Record<string, unknown>): Promise<boolean> {
    // Simulate email notification
    this.log('info', 'Email notification sent', { notificationId: notification.id })
    return true
  }

  private async sendSMSNotification(notification: Record<string, unknown>): Promise<boolean> {
    // Simulate SMS notification
    this.log('info', 'SMS notification sent', { notificationId: notification.id })
    return true
  }

  private async cacheUserNotifications(userId: string): Promise<void> {
    // Cache recent notifications for quick access
    const recentNotifications = await DatabaseService.getAll(
      'SELECT * FROM Notification WHERE userId = ? ORDER BY createdAt DESC LIMIT 10',
      [userId]
    )

    await cache.set(`notifications:${userId}:recent`, recentNotifications, 300) // 5 minutes
  }

  private mapToNotificationType(notification: Record<string, unknown>): Notification {
    return {
      id: notification.id as string,
      userId: notification.userId as string,
      title: notification.title as string,
      message: notification.message as string,
      type: notification.type as Notification['type'],
      isRead: Boolean(notification.isRead),
      createdAt: notification.createdAt as string
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService()
