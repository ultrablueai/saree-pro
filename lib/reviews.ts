import { randomUUID } from "node:crypto";
import { getDbExecutor } from "@/lib/db";

export interface Review {
  id: string;
  userId: string;
  merchantId: string;
  orderId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  userFullName: string;
  userAvatarUrl: string | null;
}

interface ReviewRow {
  id: string;
  userId: string;
  merchantId: string;
  orderId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  userFullName: string;
  userAvatarUrl: string | null;
}

function mapReview(row: ReviewRow): Review {
  return row;
}

export async function createReview(
  userId: string,
  merchantId: string,
  orderId: string,
  rating: number,
  comment?: string,
): Promise<Review> {
  const db = await getDbExecutor();

  if (rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5.");
  }

  const existing = await db.get<{ id: string }>(
    `SELECT id
     FROM reviews
     WHERE order_id = ?
     LIMIT 1`,
    [orderId],
  );
  if (existing) {
    throw new Error("This order already has a review.");
  }

  const id = randomUUID();
  await db.run(
    `INSERT INTO reviews (id, user_id, merchant_id, order_id, rating, comment, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [id, userId, merchantId, orderId, rating, comment ?? null],
  );

  await updateMerchantRating(merchantId);

  const created = await getReviewByOrderId(orderId);
  if (!created) {
    throw new Error("Review creation could not be verified.");
  }

  return created;
}

export async function getReviewsByMerchantId(merchantId: string): Promise<Review[]> {
  const db = await getDbExecutor();
  const rows = await db.all<ReviewRow>(
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
    [merchantId],
  );

  return rows.map(mapReview);
}

export async function getReviewByOrderId(orderId: string): Promise<Review | null> {
  const db = await getDbExecutor();
  const row = await db.get<ReviewRow>(
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
     WHERE r.order_id = ?
     LIMIT 1`,
    [orderId],
  );

  return row ? mapReview(row) : null;
}

export async function updateMerchantRating(merchantId: string): Promise<void> {
  const db = await getDbExecutor();
  const result = await db.get<{ avgRating: number | null }>(
    `SELECT AVG(rating) as avgRating
     FROM reviews
     WHERE merchant_id = ?`,
    [merchantId],
  );

  await db.run(
    `UPDATE merchants
     SET rating = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [result?.avgRating ?? 0, merchantId],
  );
}

export async function deleteReview(reviewId: string, userId: string): Promise<void> {
  const db = await getDbExecutor();
  const review = await db.get<{ merchant_id: string }>(
    `SELECT merchant_id
     FROM reviews
     WHERE id = ? AND user_id = ?
     LIMIT 1`,
    [reviewId, userId],
  );

  if (!review) {
    throw new Error("Review not found.");
  }

  await db.run(
    `DELETE FROM reviews
     WHERE id = ? AND user_id = ?`,
    [reviewId, userId],
  );

  await updateMerchantRating(review.merchant_id);
}
