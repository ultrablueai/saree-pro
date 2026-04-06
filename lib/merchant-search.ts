import { getDbExecutor } from '@/lib/db';

export interface MerchantSearchParams {
  search?: string;
  cuisineTags?: string[];
  minRating?: number;
  maxDeliveryFee?: number;
  isOpen?: boolean;
  sortBy?: 'rating' | 'deliveryFee' | 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface MerchantSearchResult {
  id: string;
  name: string;
  slug: string;
  description: string;
  phone: string;
  coverImageUrl: string | null;
  logoUrl: string | null;
  cuisineTags: string[];
  deliveryFeeAmount: number;
  minimumOrderAmount: number;
  currency: string;
  status: string;
  rating: number;
  isOpen: boolean;
  nextOpenHour: string | null;
}

export async function searchMerchants(
  params: MerchantSearchParams
): Promise<{ merchants: MerchantSearchResult[]; total: number }> {
  const db = await getDbExecutor();
  
  const {
    search,
    cuisineTags = [],
    minRating = 0,
    maxDeliveryFee,
    isOpen,
    sortBy = 'rating',
    sortOrder = 'desc',
    page = 1,
    limit = 20,
  } = params;

  let whereClause = 'WHERE m.status = ?';
  const queryParams: any[] = ['active'];

  // البحث بالاسم أو الوصف
  if (search) {
    whereClause += ' AND (m.name LIKE ? OR m.description LIKE ?)';
    queryParams.push(`%${search}%`, `%${search}%`);
  }

  // تصفية حسب نوع المطبخ
  if (cuisineTags.length > 0) {
    const tagConditions = cuisineTags.map(() => 'm.cuisine_tags LIKE ?').join(' OR ');
    whereClause += ` AND (${tagConditions})`;
    queryParams.push(...cuisineTags.map(tag => `%${tag}%`));
  }

  // تصفية حسب التقييم
  if (minRating > 0) {
    whereClause += ' AND m.rating >= ?';
    queryParams.push(minRating);
  }

  // تصفية حسب رسوم التوصيل
  if (maxDeliveryFee !== undefined) {
    whereClause += ' AND m.delivery_fee_amount <= ?';
    queryParams.push(maxDeliveryFee);
  }

  // تصفية حسب حالة الفتح
  if (isOpen !== undefined) {
    if (isOpen) {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const currentTime = now.toTimeString().slice(0, 5);
      
      whereClause += ` AND EXISTS (
        SELECT 1 FROM merchant_hours mh 
        WHERE mh.merchant_id = m.id 
        AND mh.day_of_week = ? 
        AND mh.is_closed = 0 
        AND mh.opens_at <= ? 
        AND mh.closes_at >= ?
      )`;
      queryParams.push(dayOfWeek, currentTime, currentTime);
    } else {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const currentTime = now.toTimeString().slice(0, 5);
      
      whereClause += ` AND NOT EXISTS (
        SELECT 1 FROM merchant_hours mh 
        WHERE mh.merchant_id = m.id 
        AND mh.day_of_week = ? 
        AND mh.is_closed = 0 
        AND mh.opens_at <= ? 
        AND mh.closes_at >= ?
      )`;
      queryParams.push(dayOfWeek, currentTime, currentTime);
    }
  }

  // ترتيب النتائج
  const sortMapping: Record<string, string> = {
    rating: 'm.rating',
    deliveryFee: 'm.delivery_fee_amount',
    name: 'm.name',
    createdAt: 'm.created_at',
  };

  const sortColumn = sortMapping[sortBy] || 'm.rating';
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

  // حساب العدد الإجمالي
  const countQuery = `SELECT COUNT(*) as count FROM merchants m ${whereClause}`;
  const countResult = await db.get<{ count: number }>(countQuery, queryParams);
  const total = countResult?.count || 0;

  // جلب النتائج
  const offset = (page - 1) * limit;
  const dataQuery = `
    SELECT 
      m.id,
      m.name,
      m.slug,
      m.description,
      m.phone,
      m.cover_image_url as coverImageUrl,
      m.logo_url as logoUrl,
      m.cuisine_tags as cuisineTags,
      m.delivery_fee_amount as deliveryFeeAmount,
      m.minimum_order_amount as minimumOrderAmount,
      m.currency,
      m.status,
      m.rating
    FROM merchants m
    ${whereClause}
    ORDER BY ${sortColumn} ${order}
    LIMIT ? OFFSET ?
  `;

  const merchants = await db.all<any[]>(dataQuery, [...queryParams, limit, offset]);

  return {
    merchants: merchants.map(m => ({
      ...m,
      cuisineTags: m.cuisineTags.split(',').filter(Boolean),
      isOpen: false, // سيتم حسابه بشكل منفصل
      nextOpenHour: null,
    })),
    total,
  };
}

export async function getMerchantById(merchantId: string): Promise<any> {
  const db = await getDbExecutor();
  
  const merchant = await db.get<any>(
    `SELECT 
      m.id,
      m.name,
      m.slug,
      m.description,
      m.phone,
      m.cover_image_url as coverImageUrl,
      m.logo_url as logoUrl,
      m.cuisine_tags as cuisineTags,
      m.delivery_fee_amount as deliveryFeeAmount,
      m.minimum_order_amount as minimumOrderAmount,
      m.currency,
      m.status,
      m.rating,
      m.created_at as createdAt,
      m.updated_at as updatedAt
    FROM merchants m
    WHERE m.id = ?`,
    [merchantId]
  );

  if (!merchant) {
    return null;
  }

  // الحصول على ساعات العمل
  const hours = await db.all<any[]>(
    `SELECT day_of_week as dayOfWeek, opens_at as opensAt, closes_at as closesAt, is_closed as isClosed
     FROM merchant_hours
     WHERE merchant_id = ?
     ORDER BY day_of_week`,
    [merchantId]
  );

  // التحقق من حالة الفتح الحالية
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentTime = now.toTimeString().slice(0, 5);
  
  const todayHours = hours.find(h => h.dayOfWeek === dayOfWeek);
  const isOpen = todayHours && 
    !todayHours.isClosed && 
    todayHours.opensAt <= currentTime && 
    todayHours.closesAt >= currentTime;

  return {
    ...merchant,
    cuisineTags: merchant.cuisineTags.split(',').filter(Boolean),
    hours,
    isOpen: Boolean(isOpen),
  };
}

export async function getAllMerchants(): Promise<any[]> {
  const db = await getDbExecutor();
  
  const merchants = await db.all<any[]>(
    `SELECT 
      m.id,
      m.name,
      m.slug,
      m.description,
      m.phone,
      m.cover_image_url as coverImageUrl,
      m.logo_url as logoUrl,
      m.cuisine_tags as cuisineTags,
      m.delivery_fee_amount as deliveryFeeAmount,
      m.minimum_order_amount as minimumOrderAmount,
      m.currency,
      m.status,
      m.rating
    FROM merchants m
    WHERE m.status = 'active'
    ORDER BY m.rating DESC, m.created_at DESC`
  );

  return merchants.map(m => ({
    ...m,
    cuisineTags: m.cuisineTags.split(',').filter(Boolean),
  }));
}
