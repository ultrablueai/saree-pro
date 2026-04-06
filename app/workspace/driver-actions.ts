"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/auth";
import { getDbExecutor, withTransaction } from "@/lib/db";
import {
  calculateSettlementBreakdown,
  insertFinancialLedgerEntry,
} from "@/lib/financials";

async function getDriverForSession(userId: string) {
  const db = await getDbExecutor();
  return db.get<{ id: string; availability: string }>(
    `SELECT id, availability
     FROM driver_profiles
     WHERE user_id = ?
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

export async function updateDriverAvailability(formData: FormData) {
  const session = await requireSessionUser();
  if (session.role !== "driver") return;

  const driver = await getDriverForSession(session.id);
  if (!driver) return;

  const nextAvailability = String(formData.get("availability") ?? "").trim();
  if (!["offline", "available", "on_delivery"].includes(nextAvailability)) return;

  const db = await getDbExecutor();
  await db.run(
    `UPDATE driver_profiles
     SET availability = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [nextAvailability, driver.id],
  );

  await writeAuditLog(session.id, `driver_availability_${nextAvailability}`, "driver_profile", driver.id);
  revalidatePath("/workspace");
}

export async function claimDriverOrder(formData: FormData) {
  const session = await requireSessionUser();
  if (session.role !== "driver") return;

  const driver = await getDriverForSession(session.id);
  if (!driver) return;

  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) return;

  const db = await getDbExecutor();
  const order = await db.get<{ id: string; driver_id: string | null }>(
    `SELECT id, driver_id
     FROM orders
     WHERE id = ?
       AND status = 'ready'
       AND (driver_id IS NULL OR driver_id = ?)
     LIMIT 1`,
    [orderId, driver.id],
  );
  if (!order) return;

  await withTransaction(async (tx) => {
    await tx.run(
      `UPDATE orders
       SET driver_id = COALESCE(driver_id, ?),
           status = 'picked_up',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [driver.id, order.id],
    );

    await tx.run(
      `UPDATE driver_profiles
       SET availability = 'on_delivery', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [driver.id],
    );
  });

  await writeAuditLog(session.id, "driver_claimed_order", "order", order.id);
  revalidatePath("/workspace");
  revalidatePath("/workspace/orders");
  revalidatePath(`/workspace/orders/${order.id}`);
}

export async function completeDriverOrder(formData: FormData) {
  const session = await requireSessionUser();
  if (session.role !== "driver") return;

  const driver = await getDriverForSession(session.id);
  if (!driver) return;

  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) return;

  const db = await getDbExecutor();
  const order = await db.get<{
    id: string;
    customer_id: string;
    merchant_id: string;
    subtotal_amount: number;
    delivery_fee_amount: number;
    currency: string;
  }>(
    `SELECT id, customer_id, merchant_id, subtotal_amount, delivery_fee_amount, currency
     FROM orders
     WHERE id = ?
       AND driver_id = ?
       AND status = 'picked_up'
     LIMIT 1`,
    [orderId, driver.id],
  );
  if (!order) return;

  await withTransaction(async (tx) => {
    const settlement = calculateSettlementBreakdown(
      order.subtotal_amount,
      order.delivery_fee_amount,
    );

    await tx.run(
      `UPDATE orders
       SET status = 'delivered',
           delivered_at = CURRENT_TIMESTAMP,
           payment_status = 'paid',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [order.id],
    );

    await insertFinancialLedgerEntry(
      {
        orderId: order.id,
        entryType: "escrow_release",
        partyType: "platform",
        amount: settlement.totalSettledAmount,
        currency: order.currency,
        note: "Escrow released after delivery confirmation",
      },
      tx,
    );
    await insertFinancialLedgerEntry(
      {
        orderId: order.id,
        entryType: "platform_fee",
        partyType: "platform",
        amount: settlement.platformFeeAmount,
        currency: order.currency,
        note: "Platform fee settlement",
      },
      tx,
    );
    await insertFinancialLedgerEntry(
      {
        orderId: order.id,
        entryType: "merchant_payout",
        partyType: "merchant",
        partyId: order.merchant_id,
        amount: settlement.merchantPayoutAmount,
        currency: order.currency,
        note: "Merchant payout due",
      },
      tx,
    );
    await insertFinancialLedgerEntry(
      {
        orderId: order.id,
        entryType: "driver_payout",
        partyType: "driver",
        partyId: driver.id,
        amount: settlement.driverPayoutAmount,
        currency: order.currency,
        note: "Driver payout due",
      },
      tx,
    );

    await tx.run(
      `UPDATE payment_transactions
       SET status = 'released', processed_at = CURRENT_TIMESTAMP
       WHERE order_id = ? AND status = 'held'`,
      [order.id],
    );

    await tx.run(
      `UPDATE driver_profiles
       SET availability = 'available', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [driver.id],
    );
  });

  await writeAuditLog(session.id, "driver_completed_order", "order", order.id);
  revalidatePath("/workspace");
  revalidatePath("/workspace/orders");
  revalidatePath(`/workspace/orders/${order.id}`);
}
