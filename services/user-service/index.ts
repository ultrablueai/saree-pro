import { BaseService } from '../shared/base-service'
import { User, CreateUserRequest, ServiceResponse } from '../shared/types'
import { cache } from '../../lib/redis'
import { getDbExecutor } from '../../lib/db'

export class UserService extends BaseService {
  constructor() {
    super('user-service')
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy', details?: Record<string, unknown> }> {
    try {
      const db = await getDbExecutor()
      await db.get('SELECT 1')
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

  async createUser(request: CreateUserRequest): Promise<ServiceResponse<User>> {
    return this.withErrorHandling(async () => {
      const db = await getDbExecutor()
      
      // Check if user already exists
      const existingUser = await db.get('SELECT * FROM AppUser WHERE email = ?', [request.email])

      if (existingUser) {
        throw new Error('User with this email already exists')
      }

      // Create user
      const passwordHash = request.password ? await this.hashPassword(request.password) : null
      const result = await db.run(
        `INSERT INTO AppUser (email, role, fullName, phone, passwordHash, isActive, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [request.email, request.role, request.fullName, request.phone, passwordHash, true]
      )

      const user = await db.get('SELECT * FROM AppUser WHERE id = ?', [result.lastID])

      // Cache user
      await cache.set(`user:${user.id}`, user, 3600)

      this.log('info', 'User created successfully', { userId: user.id, email: user.email })
      
      return this.mapToUserType(user)
    })
  }

  async getUserById(userId: string): Promise<ServiceResponse<User>> {
    return this.withErrorHandling(async () => {
      // Try cache first
      const cachedUser = await cache.get(`user:${userId}`)
      if (cachedUser) {
        return cachedUser as User
      }

      // Get from database
      const db = await getDbExecutor()
      const user = await db.get('SELECT * FROM AppUser WHERE id = ?', [userId])

      if (!user) {
        throw new Error('User not found')
      }

      // Cache the result
      await cache.set(`user:${userId}`, user, 3600)

      return this.mapToUserType(user)
    })
  }

  async getUserByEmail(email: string): Promise<ServiceResponse<User>> {
    return this.withErrorHandling(async () => {
      const db = await getDbExecutor()
      const user = await db.get('SELECT * FROM AppUser WHERE email = ?', [email])

      if (!user) {
        throw new Error('User not found')
      }

      return this.mapToUserType(user)
    })
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<ServiceResponse<User>> {
    return this.withErrorHandling(async () => {
      const db = await getDbExecutor()
      
      await db.run(
        `UPDATE AppUser SET fullName = ?, phone = ?, avatarUrl = ?, updatedAt = datetime('now') WHERE id = ?`,
        [updates.fullName, updates.phone, updates.avatarUrl, userId]
      )

      const user = await db.get('SELECT * FROM AppUser WHERE id = ?', [userId])

      // Invalidate cache
      await cache.invalidateUserCache(userId)

      this.log('info', 'User updated successfully', { userId })
      
      return this.mapToUserType(user)
    })
  }

  async deactivateUser(userId: string): Promise<ServiceResponse<boolean>> {
    return this.withErrorHandling(async () => {
      const db = await getDbExecutor()
      
      await db.run('UPDATE AppUser SET isActive = false WHERE id = ?', [userId])

      // Invalidate cache
      await cache.invalidateUserCache(userId)

      this.log('info', 'User deactivated', { userId })
      
      return true
    })
  }

  async listUsers(page: number = 1, limit: number = 20, role?: string): Promise<ServiceResponse<{
    items: User[]
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
      const db = await getDbExecutor()

      let whereClause = ''
      let params: unknown[] = [offset, take]
      
      if (role) {
        whereClause = 'WHERE role = ?'
        params = [role, offset, take]
      }

      const [users, totalResult] = await Promise.all([
        db.all(`SELECT * FROM AppUser ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`, params),
        db.get(`SELECT COUNT(*) as total FROM AppUser ${whereClause}`, role ? [role] : [])
      ])

      const total = totalResult.total
      const mappedUsers = users.map((user: unknown) => this.mapToUserType(user))

      return this.createPaginatedResponse(mappedUsers, total, currentPage, take).data!
    })
  }

  private async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcryptjs')
    return bcrypt.hash(password, 12)
  }

  private mapToUserType(user: Record<string, unknown>): User {
    return {
      id: user.id as string,
      email: user.email as string,
      role: user.role as User['role'],
      fullName: user.fullName as string,
      phone: user.phone as string,
      avatarUrl: user.avatarUrl as string,
      isActive: Boolean(user.isActive),
      createdAt: user.createdAt as string,
      updatedAt: user.updatedAt as string
    }
  }
}

// Export singleton instance
export const userService = new UserService()
