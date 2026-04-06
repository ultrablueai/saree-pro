'use server';

import { getSessionUser } from '@/lib/auth';
import { getDbExecutor } from '@/lib/db';

export async function createReview(
  orderId: string,
  merchantId: string,
  rating: number,
  comment?: string
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return { error: 'يجب تسجيل الدخول' };
    }

    if (rating < 1 || rating > 5) {
      return { error: 'التقييم يجب أن يكون بين 1 و 5' };
    }

    const db = await getDbExecutor();

    // Check if review already exists
    const existing = await db.get(
      `SELECT id FROM "Review" WHERE "orderId" = ?`,
      [orderId]
    );

    if (existing) {
      return { error: 'تم تقييم هذا الطلب مسبقاً' };
    }

    // Create review
    const result = await db.run(
      `INSERT INTO "Review" (id, "userId", "merchantId", "orderId", rating, comment, "createdAt", "updatedAt")
       VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [session.id, merchantId, orderId, rating, comment || null]
    );

    // Update merchant rating
    const avgResult = await db.get<{ avg: number }>(
      `SELECT AVG(rating) as avg FROM "Review" WHERE "merchantId" = ?`,
      [merchantId]
    );

    if (avgResult) {
      await db.run(
        `UPDATE "Merchant" SET rating = ?, "updatedAt" = datetime('now') WHERE id = ?`,
        [avgResult.avg, merchantId]
      );
    }

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'فشل إرسال التقييم' };
  }
}
