import { BaseService } from '../shared/base-service'
import { Merchant, MenuItem, ServiceResponse } from '../shared/types'
import { cache } from '../../lib/redis'
import { DatabaseService } from '../shared/database'

export class MerchantService extends BaseService {
  constructor() {
    super('merchant-service')
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

  async getMerchantById(merchantId: string): Promise<ServiceResponse<Merchant>> {
    return this.withErrorHandling(async () => {
      // Try cache first
      const cachedMerchant = await cache.get(`merchant:${merchantId}`)
      if (cachedMerchant) {
        return cachedMerchant as Merchant
      }

      // Get from database
      const merchant = await DatabaseService.getOne('SELECT * FROM Merchant WHERE id = ?', [merchantId])

      if (!merchant) {
        throw new Error('Merchant not found')
      }

      // Cache the result
      await cache.set(`merchant:${merchantId}`, merchant, 3600)

      return this.mapToMerchantType(merchant)
    })
  }

  async getMerchantBySlug(slug: string): Promise<ServiceResponse<Merchant>> {
    return this.withErrorHandling(async () => {
      const merchant = await DatabaseService.getOne('SELECT * FROM Merchant WHERE slug = ?', [slug])

      if (!merchant) {
        throw new Error('Merchant not found')
      }

      return this.mapToMerchantType(merchant)
    })
  }

  async listMerchants(page: number = 1, limit: number = 20, status?: string): Promise<ServiceResponse<{
    items: Merchant[]
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

      let whereClause = ''
      let params: (string | number | boolean | null)[] = [offset, take]
      
      if (status) {
        whereClause = 'WHERE status = ?'
        params = [status, offset, take]
      }

      const [merchants, totalResult] = await Promise.all([
        DatabaseService.getAll(`SELECT * FROM Merchant ${whereClause} ORDER BY rating DESC LIMIT ? OFFSET ?`, params),
        DatabaseService.getOne(`SELECT COUNT(*) as total FROM Merchant ${whereClause}`, status ? [status] : [])
      ])

      const total = totalResult?.total || 0
      const mappedMerchants = merchants.map((merchant) => this.mapToMerchantType(merchant))

      return this.createPaginatedResponse(mappedMerchants, total, currentPage, take).data!
    })
  }

  async getMerchantMenu(merchantId: string): Promise<ServiceResponse<MenuItem[]>> {
    return this.withErrorHandling(async () => {
      // Try cache first
      const cachedMenu = await cache.get(`menu:${merchantId}`)
      if (cachedMenu) {
        return cachedMenu as MenuItem[]
      }

      // Get from database
      const menuItems = await DatabaseService.getAll(
        `SELECT mi.*, mc.name as categoryName 
         FROM MenuItem mi 
         LEFT JOIN MenuCategory mc ON mi.menuCategoryId = mc.id 
         WHERE mi.merchantId = ? AND mi.isAvailable = 1 
         ORDER BY mc.sortOrder, mi.name`,
        [merchantId]
      )

      const mappedItems = menuItems.map((item) => this.mapToMenuItemType(item))

      // Cache the result
      await cache.set(`menu:${merchantId}`, mappedItems, 1800) // 30 minutes

      return mappedItems
    })
  }

  async createMerchant(merchantData: Partial<Merchant>): Promise<ServiceResponse<Merchant>> {
    return this.withErrorHandling(async () => {
      // Generate unique slug
      const slug = this.generateSlug(merchantData.name || '')
      
      const result = await DatabaseService.run(
        `INSERT INTO Merchant (
          name, slug, description, phone, status, rating, 
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          merchantData.name,
          slug,
          merchantData.description,
          merchantData.phone,
          'draft',
          0,
        ]
      )

      const merchant = await DatabaseService.getOne('SELECT * FROM Merchant WHERE id = ?', [result.lastID])

      // Cache merchant
      await cache.set(`merchant:${merchant.id}`, merchant, 3600)

      this.log('info', 'Merchant created successfully', { merchantId: merchant.id, name: merchant.name })
      
      return this.mapToMerchantType(merchant)
    })
  }

  async updateMerchant(merchantId: string, updates: Partial<Merchant>): Promise<ServiceResponse<Merchant>> {
    return this.withErrorHandling(async () => {
      await DatabaseService.run(
        `UPDATE Merchant SET name = ?, description = ?, phone = ?, updatedAt = datetime('now') WHERE id = ?`,
        [updates.name, updates.description, updates.phone, merchantId]
      )

      const merchant = await DatabaseService.getOne('SELECT * FROM Merchant WHERE id = ?', [merchantId])

      // Invalidate cache
      await cache.invalidateMerchantCache(merchantId)

      this.log('info', 'Merchant updated successfully', { merchantId })
      
      return this.mapToMerchantType(merchant)
    })
  }

  async addMenuItem(merchantId: string, itemData: Partial<MenuItem>): Promise<ServiceResponse<MenuItem>> {
    return this.withErrorHandling(async () => {
      const result = await DatabaseService.run(
        `INSERT INTO MenuItem (
          merchantId, name, description, priceAmount, currency, 
          isAvailable, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          merchantId,
          itemData.name,
          itemData.description,
          itemData.priceAmount,
          'SAR',
          itemData.isAvailable !== false,
        ]
      )

      const menuItem = await DatabaseService.getOne('SELECT * FROM MenuItem WHERE id = ?', [result.lastID])

      // Invalidate menu cache
      await cache.invalidatePattern(`menu:${merchantId}`)

      this.log('info', 'Menu item added successfully', { merchantId, menuItemId: menuItem.id })
      
      return this.mapToMenuItemType(menuItem)
    })
  }

  async updateMenuItem(menuItemId: string, updates: Partial<MenuItem>): Promise<ServiceResponse<MenuItem>> {
    return this.withErrorHandling(async () => {
      await DatabaseService.run(
        `UPDATE MenuItem SET name = ?, description = ?, priceAmount = ?, isAvailable = ?, updatedAt = datetime('now') WHERE id = ?`,
        [updates.name, updates.description, updates.priceAmount, updates.isAvailable, menuItemId]
      )

      const menuItem = await DatabaseService.getOne('SELECT * FROM MenuItem WHERE id = ?', [menuItemId])

      // Invalidate menu cache
      await cache.invalidatePattern(`menu:*`)

      this.log('info', 'Menu item updated successfully', { menuItemId })
      
      return this.mapToMenuItemType(menuItem)
    })
  }

  private generateSlug(name: string): string {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-')

    const timestamp = Date.now().toString(36)
    return `${baseSlug}-${timestamp}`
  }

  private mapToMerchantType(merchant: Record<string, unknown>): Merchant {
    return {
      id: merchant.id as string,
      name: merchant.name as string,
      slug: merchant.slug as string,
      description: merchant.description as string,
      phone: merchant.phone as string,
      status: merchant.status as Merchant['status'],
      rating: Number(merchant.rating) || 0,
      createdAt: merchant.createdAt as string,
      updatedAt: merchant.updatedAt as string
    }
  }

  private mapToMenuItemType(item: Record<string, unknown>): MenuItem {
    return {
      id: item.id as string,
      merchantId: item.merchantId as string,
      name: item.name as string,
      description: item.description as string,
      priceAmount: Number(item.priceAmount),
      currency: item.currency as string,
      isAvailable: Boolean(item.isAvailable),
      createdAt: item.createdAt as string,
      updatedAt: item.updatedAt as string
    }
  }
}

// Export singleton instance
export const merchantService = new MerchantService()
