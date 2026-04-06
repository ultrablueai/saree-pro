import Redis from 'ioredis'

// Redis configuration for production-ready caching
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
}

// Create Redis client with fallback
let redis: Redis | null = null

try {
  redis = new Redis(redisConfig)
  
  redis.on('connect', () => {
    console.log('✅ Redis connected successfully')
  })
  
  redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err)
    redis = null
  })
  
  redis.on('close', () => {
    console.log('🔌 Redis connection closed')
  })
} catch (error) {
  console.error('❌ Failed to initialize Redis:', error)
  redis = null
}

// Cache helper functions
export class CacheService {
  private static instance: CacheService
  private client: Redis | null

  constructor() {
    this.client = redis
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService()
    }
    return CacheService.instance
  }

  // Generic cache methods
  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null
    
    try {
      const value = await this.client.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number = 3600): Promise<boolean> {
    if (!this.client) return false
    
    try {
      await this.client.setex(key, ttlSeconds, JSON.stringify(value))
      return true
    } catch (error) {
      console.error('Cache set error:', error)
      return false
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.client) return false
    
    try {
      await this.client.del(key)
      return true
    } catch (error) {
      console.error('Cache delete error:', error)
      return false
    }
  }

  async invalidatePattern(pattern: string): Promise<boolean> {
    if (!this.client) return false
    
    try {
      const keys = await this.client.keys(pattern)
      if (keys.length > 0) {
        await this.client.del(...keys)
      }
      return true
    } catch (error) {
      console.error('Cache invalidate pattern error:', error)
      return false
    }
  }

  // Specific cache methods for Saree Pro
  async getMenuItems(merchantId: string): Promise<unknown[] | null> {
    return this.get(`menu:${merchantId}:items`)
  }

  async setMenuItems(merchantId: string, items: unknown[]): Promise<boolean> {
    return this.set(`menu:${merchantId}:items`, items, 1800) // 30 minutes
  }

  async getMerchantInfo(merchantId: string): Promise<unknown | null> {
    return this.get(`merchant:${merchantId}:info`)
  }

  async setMerchantInfo(merchantId: string, info: unknown): Promise<boolean> {
    return this.set(`merchant:${merchantId}:info`, info, 3600) // 1 hour
  }

  async getUserOrders(userId: string): Promise<unknown[] | null> {
    return this.get(`user:${userId}:orders`)
  }

  async setUserOrders(userId: string, orders: unknown[]): Promise<boolean> {
    return this.set(`user:${userId}:orders`, orders, 300) // 5 minutes
  }

  async getDriverLocation(driverId: string): Promise<{lat: number, lng: number} | null> {
    return this.get(`driver:${driverId}:location`)
  }

  async setDriverLocation(driverId: string, location: {lat: number, lng: number}): Promise<boolean> {
    return this.set(`driver:${driverId}:location`, location, 60) // 1 minute
  }

  // Cache invalidation methods
  async invalidateMerchantCache(merchantId: string): Promise<void> {
    await this.invalidatePattern(`merchant:${merchantId}:*`)
    await this.invalidatePattern(`menu:${merchantId}:*`)
  }

  async invalidateUserCache(userId: string): Promise<void> {
    await this.invalidatePattern(`user:${userId}:*`)
  }

  async invalidateDriverCache(driverId: string): Promise<void> {
    await this.invalidatePattern(`driver:${driverId}:*`)
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    if (!this.client) return false
    
    try {
      const result = await this.client.ping()
      return result === 'PONG'
    } catch {
      return false
    }
  }

  // Statistics
  async getStats(): Promise<{memory?: string, keyspace?: string, connected: boolean, error?: unknown}> {
    if (!this.client) return null
    
    try {
      const info = await this.client.info('memory')
      const keyspace = await this.client.info('keyspace')
      return {
        memory: info,
        keyspace: keyspace,
        connected: true
      }
    } catch (err) {
      return { connected: false, error: err }
    }
  }
}

export const cache = CacheService.getInstance()
export default redis
