"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { getDbExecutor } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export async function createReview(
  orderId: string,
  merchantId: string,
  rating: number,
  comment?: string,
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return { error: "You must be signed in." };
    }

    if (session.role !== "customer") {
      return { error: "Only customers can submit reviews." };
    }

    if (rating < 1 || rating > 5) {
      return { error: "Rating must be between 1 and 5." };
    }

    const db = await getDbExecutor();
    const order = await db.get<{
      id: string;
      customer_id: string;
      merchant_id: string;
      status: string;
    }>(
      `SELECT id, customer_id, merchant_id, status
       FROM orders
       WHERE id = ?
       LIMIT 1`,
      [orderId],
    );

    if (!order || order.customer_id !== session.id || order.merchant_id !== merchantId) {
      return { error: "Review target not found." };
    }

    if (order.status !== "delivered") {
      return { error: "Reviews are only available after delivery." };
    }

    const existing = await db.get<{ id: string }>(
      `SELECT id
       FROM reviews
       WHERE order_id = ?
       LIMIT 1`,
      [orderId],
    );

    if (existing) {
      return { error: "This order already has a review." };
    }

    await db.run(
      `INSERT INTO reviews (id, user_id, merchant_id, order_id, rating, comment, created_at, updated_at)
       VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [session.id, merchantId, orderId, rating, comment || null],
    );

    const avgResult = await db.get<{ avg: number | null }>(
      `SELECT AVG(rating) as avg
       FROM reviews
       WHERE merchant_id = ?`,
      [merchantId],
    );

    await db.run(
      `UPDATE merchants
       SET rating = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [avgResult?.avg ?? rating, merchantId],
    );

    const merchantOwner = await db.get<{ owner_user_id: string }>(
      `SELECT owner_user_id
       FROM merchants
       WHERE id = ?
       LIMIT 1`,
      [merchantId],
    );

    if (merchantOwner) {
      await createNotification(
        merchantOwner.owner_user_id,
        "New customer review",
        `A customer rated order ${orderId} with ${rating}/5.`,
        "review",
        `/workspace/orders/${orderId}`,
      );
    }

    revalidatePath("/workspace");
    revalidatePath(`/workspace/orders/${orderId}`);
    revalidatePath("/workspace/profile");

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit review.";
    return { error: message };
  }
}
