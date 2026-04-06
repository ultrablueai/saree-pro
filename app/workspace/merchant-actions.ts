"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/auth";
import { getDbExecutor, withTransaction } from "@/lib/db";
import { insertFinancialLedgerEntry } from "@/lib/financials";

async function getMerchantForSession(userId: string) {
  const db = await getDbExecutor();
  return db.get<{ id: string; status: string }>(
    `SELECT id, status
     FROM merchants
     WHERE owner_user_id = ?
     LIMIT 1`,
    [userId],
  );
}

async function writeAuditLog(actorUserId: string, action: string, entityType: string, entityId: string) {
  const db = await getDbExecutor();
  await db.run(
    `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, meta_json, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, CURRENT_TIMESTAMP)`,
    [randomUUID(), actorUserId, action, entityType, entityId],
  );
}

export async function createMerchantCategory(formData: FormData) {
  const session = await requireSessionUser();
  if (session.role !== "merchant") return;

  const merchant = await getMerchantForSession(session.id);
  if (!merchant) return;

  const name = String(formData.get("name") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder") ?? "0");
  if (!name) return;

  const db = await getDbExecutor();
  await db.run(
    `INSERT INTO menu_categories (id, merchant_id, name, sort_order, created_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [randomUUID(), merchant.id, name, Number.isNaN(sortOrder) ? 0 : sortOrder],
  );

  revalidatePath("/workspace");
}

export async function createMerchantMenuItem(formData: FormData) {
  const session = await requireSessionUser();
  if (session.role !== "merchant") return;

  const merchant = await getMerchantForSession(session.id);
  if (!merchant) return;

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
  const price = Number(formData.get("price") ?? "0");
  const sortOrder = Number(formData.get("sortOrder") ?? "0");
  if (!name || !description || Number.isNaN(price) || price <= 0) return;

  const db = await getDbExecutor();
  await db.run(
    `INSERT INTO menu_items (
      id, merchant_id, category_id, name, description, price_amount, currency,
      is_available, option_groups, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'SAR', 1, NULL, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      randomUUID(),
      merchant.id,
      categoryId,
      name,
      description,
      Math.round(price * 100),
      Number.isNaN(sortOrder) ? 0 : sortOrder,
    ],
  );

  revalidatePath("/workspace");
}

export async function updateMerchantMenuItem(formData: FormData) {
  const session = await requireSessionUser();
  if (session.role !== "merchant") return;

  const merchant = await getMerchantForSession(session.id);
  if (!merchant) return;

  const itemId = String(formData.get("itemId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
  const price = Number(formData.get("price") ?? "0");
  const sortOrder = Number(formData.get("sortOrder") ?? "0");
  if (!itemId || !name || !description || Number.isNaN(price) || price <= 0) return;

  const db = await getDbExecutor();
  await db.run(
    `UPDATE menu_items
     SET name = ?, description = ?, category_id = ?, price_amount = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND merchant_id = ?`,
    [
      name,
      description,
      categoryId,
      Math.round(price * 100),
      Number.isNaN(sortOrder) ? 0 : sortOrder,
      itemId,
      merchant.id,
    ],
  );

  revalidatePath("/workspace");
}

export async function toggleMerchantMenuItemAvailability(formData: FormData) {
  const session = await requireSessionUser();
  if (session.role !== "merchant") return;

  const merchant = await getMerchantForSession(session.id);
  if (!merchant) return;

  const itemId = String(formData.get("itemId") ?? "");
  const nextValue = Number(formData.get("nextValue") ?? "0");
  const db = await getDbExecutor();
  await db.run(
    `UPDATE menu_items
     SET is_available = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND merchant_id = ?`,
    [nextValue === 1, itemId, merchant.id],
  );

  revalidatePath("/workspace");
}

export async function deleteMerchantMenuItem(formData: FormData) {
  const session = await requireSessionUser();
  if (session.role !== "merchant") return;

  const merchant = await getMerchantForSession(session.id);
  if (!merchant) return;

  const itemId = String(formData.get("itemId") ?? "");
  const db = await getDbExecutor();
  await db.run("DELETE FROM menu_items WHERE id = ? AND merchant_id = ?", [itemId, merchant.id]);
  revalidatePath("/workspace");
}

export async function toggleMerchantStatus() {
  const session = await requireSessionUser();
  if (session.role !== "merchant") return;

  const merchant = await getMerchantForSession(session.id);
  if (!merchant) return;

  const nextStatus = merchant.status === "active" ? "paused" : "active";
  const db = await getDbExecutor();
  await db.run(
    `UPDATE merchants
     SET status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [nextStatus, merchant.id],
  );

  revalidatePath("/workspace");
}

export async function advanceMerchantOrderStatus(formData: FormData) {
  const session = await requireSessionUser();
  if (session.role !== "merchant") return;

  const merchant = await getMerchantForSession(session.id);
  if (!merchant) return;

  const orderId = String(formData.get("orderId") ?? "").trim();
  const nextStatus = String(formData.get("nextStatus") ?? "").trim();
  if (!orderId || !["confirmed", "preparing", "ready", "cancelled"].includes(nextStatus)) return;

  const db = await getDbExecutor();
  const order = await db.get<{ id: string; status: string }>(
    `SELECT id, status
     FROM orders
     WHERE id = ? AND merchant_id = ?
     LIMIT 1`,
    [orderId, merchant.id],
  );
  if (!order) return;

  const now = new Date().toISOString();
  await withTransaction(async (tx) => {
    await tx.run(
      `UPDATE orders
       SET status = ?,
           payment_status = CASE
             WHEN ? = 'cancelled' THEN 'refunded'
             ELSE payment_status
           END,
           confirmed_at = CASE
             WHEN ? = 'confirmed' AND confirmed_at IS NULL THEN ?
             ELSE confirmed_at
           END,
           updated_at = ?
       WHERE id = ? AND merchant_id = ?`,
      [nextStatus, nextStatus, nextStatus, now, now, order.id, merchant.id],
    );

    if (nextStatus === "cancelled") {
      const refundTarget = await tx.get<{
        customer_id: string;
        total_amount: number;
        currency: string;
      }>(
        `SELECT customer_id, total_amount, currency
         FROM orders
         WHERE id = ?
         LIMIT 1`,
        [order.id],
      );

      await tx.run(
        `UPDATE payment_transactions
         SET status = 'refunded', processed_at = CURRENT_TIMESTAMP, failure_reason = 'merchant_cancelled'
         WHERE order_id = ? AND status = 'held'`,
        [order.id],
      );

      if (refundTarget) {
        await insertFinancialLedgerEntry(
          {
            orderId: order.id,
            entryType: "refund",
            partyType: "customer",
            partyId: refundTarget.customer_id,
            amount: refundTarget.total_amount,
            currency: refundTarget.currency,
            note: "Order cancelled before delivery",
          },
          tx,
        );
      }
    }
  });

  await writeAuditLog(session.id, `merchant_order_${nextStatus}`, "order", order.id);
  revalidatePath("/workspace");
  revalidatePath("/workspace/orders");
  revalidatePath(`/workspace/orders/${order.id}`);
}
