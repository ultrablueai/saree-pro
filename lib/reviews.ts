import { getDbExecutor } from '@/lib/db';

export interface Review {
  id: string;
  userId: string;
  merchantId: string;
  orderId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
  userFullName: string;
  userAvatarUrl: string | null;
}

export async function createReview(
  userId: string,
  merchantId: string,
  orderId: string,
  rating: number,
  comment?: string
): Promise<Review> {
  const db = await getDbExecutor();
  
  if (rating < 1 || rating > 5) {
    throw new Error('التقييم يجب أن يكون بين 1 و 5');
  }

  const result = await db.run(
    `INSERT INTO reviews (user_id, merchant_id, order_id, rating, comment, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [userId, merchantId, orderId, rating, comment || null]
  );

  // تحديث تقييم التاجر
  await updateMerchantRating(merchantId);

  return {
    id: (result as any).id,
    userId,
    merchantId,
    orderId,
    rating,
    comment: comment || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    userFullName: '',
    userAvatarUrl: null,
  };
}

export async function getReviewsByMerchantId(merchantId: string): Promise<Review[]> {
  const db = await getDbExecutor();
  return db.all<Review[]>(
    `SELECT 
      r.id,
      r.user_id as userId,
      r.merchant_id as merchantId,
      r.order_id as orderId,
      r.rating,
      r.comment,
      r.created_at as createdAt,
      r.updated_at as updatedAt,
      u.full_name as userFullName,
      u.avatar_url as userAvatarUrl
    FROM reviews r
    INNER JOIN app_users u ON r.user_id = u.id
    WHERE r.merchant_id = ?
    ORDER BY r.created_at DESC`,
    [merchantId]
  );
}

export async function getReviewByOrderId(orderId: string): Promise<Review | null> {
  const db = await getDbExecutor();
  return db.get<Review | null>(
    `SELECT 
      r.id,
      r.user_id as userId,
      r.merchant_id as merchantId,
      r.order_id as orderId,
      r.rating,
      r.comment,
      r.created_at as createdAt,
      r.updated_at as updatedAt,
      u.full_name as userFullName,
      u.avatar_url as userAvatarUrl
    FROM reviews r
    INNER JOIN app_users u ON r.user_id = u.id
    WHERE r.order_id = ?`,
    [orderId]
  );
}

export async function updateMerchantRating(merchantId: string): Promise<void> {
  const db = await getDbExecutor();
  
  const result = await db.get<{ avg_rating: number }>(
    `SELECT AVG(rating) as avg_rating FROM reviews WHERE merchant_id = ?`,
    [merchantId]
  );

  const avgRating = result?.avg_rating || 0;

  await db.run(
    `UPDATE merchants SET rating = ?, updated_at = datetime('now') WHERE id = ?`,
    [avgRating, merchantId]
  );
}

export async function deleteReview(reviewId: string, userId: string): Promise<void> {
  const db = await getDbExecutor();
  const review = await db.get<{ merchant_id: string }>(
    `SELECT merchant_id FROM reviews WHERE id = ? AND user_id = ?`,
    [reviewId, userId]
  );

  if (!review) {
    throw new Error('المراجعة غير موجودة');
  }

  await db.run(
    `DELETE FROM reviews WHERE id = ? AND user_id = ?`,
    [reviewId, userId]
  );

  // تحديث تقييم التاجر بعد الحذف
  await updateMerchantRating(review.merchant_id);
}
