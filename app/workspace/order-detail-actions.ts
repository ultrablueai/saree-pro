"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/auth";
import { getDbExecutor, withTransaction } from "@/lib/db";
import {
  calculateSettlementBreakdown,
  insertFinancialLedgerEntry,
} from "@/lib/financials";

async function writeAuditLog(actorUserId: string, action: string, entityType: string, entityId: string) {
  const db = await getDbExecutor();
  await db.run(
    `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, meta_json, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, CURRENT_TIMESTAMP)`,
    [randomUUID(), actorUserId, action, entityType, entityId],
  );
}

function revalidateOrderViews(orderId: string) {
  revalidatePath("/workspace");
  revalidatePath("/workspace/orders");
  revalidatePath(`/workspace/orders/${orderId}`);
}

async function getAssignableOrder(orderId: string) {
  const db = await getDbExecutor();
  return db.get<{ id: string; status: string }>(
    `SELECT id, status
     FROM orders
     WHERE id = ?
     LIMIT 1`,
    [orderId],
  );
}

async function getBestFitDriver() {
  const db = await getDbExecutor();
  return db.get<{
    id: string;
    driver_name: string;
    availability: string;
    active_order_count: number;
  }>(
    `SELECT
        dp.id,
        du.full_name AS driver_name,
        dp.availability,
        CAST(COUNT(active_orders.id) AS INTEGER) AS active_order_count
     FROM driver_profiles dp
     INNER JOIN app_users du ON du.id = dp.user_id
     LEFT JOIN orders active_orders
       ON active_orders.driver_id = dp.id
      AND active_orders.status IN ('ready', 'picked_up')
     WHERE dp.is_verified = true
     GROUP BY dp.id, du.full_name, dp.availability
     ORDER BY
       CASE dp.availability
         WHEN 'available' THEN 1
         WHEN 'on_delivery' THEN 2
         ELSE 3
       END,
       active_order_count ASC,
       du.full_name ASC
     LIMIT 1`,
  );
}

export async function openOrderDispute(formData: FormData) {
  const session = await requireSessionUser();
  if (!["customer", "driver", "merchant"].includes(session.role)) return;

  const orderId = String(formData.get("orderId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();
  if (!orderId || !reason) return;

  const db = await getDbExecutor();
  const order = await db.get<{
    id: string;
    customer_id: string;
    merchant_id: string;
    driver_user_id: string | null;
  }>(
    `SELECT o.id, o.customer_id, o.merchant_id, dp.user_id AS driver_user_id
     FROM orders o
     LEFT JOIN driver_profiles dp ON dp.id = o.driver_id
     WHERE o.id = ?
     LIMIT 1`,
    [orderId],
  );
  if (!order) return;

  const canOpen =
    (session.role === "customer" && order.customer_id === session.id) ||
    (session.role === "driver" && order.driver_user_id === session.id) ||
    (session.role === "merchant" &&
      Boolean(
        await db.get("SELECT 1 FROM merchants WHERE id = ? AND owner_user_id = ? LIMIT 1", [
          order.merchant_id,
          session.id,
        ]),
      ));
  if (!canOpen) return;

  const existingOpenDispute = await db.get<{ id: string }>(
    `SELECT id
     FROM order_disputes
     WHERE order_id = ? AND status = 'open'
     LIMIT 1`,
    [orderId],
  );
  if (existingOpenDispute) return;

  await db.run(
    `INSERT INTO order_disputes (
      id, order_id, opened_by_user_id, opened_by_role, reason, details, status,
      resolution, resolution_note, resolved_by_user_id, created_at, updated_at, resolved_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'open', NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL)`,
    [randomUUID(), orderId, session.id, session.role, reason, details || null],
  );

  await writeAuditLog(session.id, "dispute_opened", "order", orderId);
  revalidateOrderViews(orderId);
}

async function settlementAlreadyExists(orderId: string) {
  const db = await getDbExecutor();
  const row = await db.get<{ count: number }>(
    `SELECT CAST(COUNT(*) AS INTEGER) as count
     FROM financial_ledger_entries
     WHERE order_id = ? AND entry_type = 'platform_fee'`,
    [orderId],
  );
  return (row?.count ?? 0) > 0;
}

export async function resolveOrderDispute(formData: FormData) {
  const session = await requireSessionUser();
  if (!session.ownerAccess && session.role !== "admin") return;

  const disputeId = String(formData.get("disputeId") ?? "").trim();
  const resolution = String(formData.get("resolution") ?? "").trim();
  const resolutionNote = String(formData.get("resolutionNote") ?? "").trim();
  if (!disputeId || !["refund_customer", "release_funds", "dismiss"].includes(resolution)) return;

  const db = await getDbExecutor();
  const dispute = await db.get<{
    id: string;
    order_id: string;
    status: string;
    customer_id: string;
    merchant_id: string;
    driver_id: string | null;
    subtotal_amount: number;
    delivery_fee_amount: number;
    total_amount: number;
    currency: string;
  }>(
    `SELECT d.id, d.order_id, d.status, o.customer_id, o.merchant_id, o.driver_id,
            o.subtotal_amount, o.delivery_fee_amount, o.total_amount, o.currency
     FROM order_disputes d
     INNER JOIN orders o ON o.id = d.order_id
     WHERE d.id = ?
     LIMIT 1`,
    [disputeId],
  );
  if (!dispute || dispute.status !== "open") return;

  await withTransaction(async (tx) => {
    if (resolution === "refund_customer") {
      await tx.run(
        `UPDATE payment_transactions
         SET status = 'refunded', processed_at = CURRENT_TIMESTAMP, failure_reason = 'owner_dispute_refund'
         WHERE order_id = ? AND status IN ('held', 'released')`,
        [dispute.order_id],
      );

      await tx.run(
        `UPDATE orders
         SET payment_status = 'refunded', status = 'cancelled', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [dispute.order_id],
      );

      await insertFinancialLedgerEntry(
        {
          orderId: dispute.order_id,
          entryType: "refund",
          partyType: "customer",
          partyId: dispute.customer_id,
          amount: dispute.total_amount,
          currency: dispute.currency,
          note: resolutionNote || "Owner approved customer refund",
        },
        tx,
      );
    }

    if (resolution === "release_funds" && !(await settlementAlreadyExists(dispute.order_id))) {
      const settlement = calculateSettlementBreakdown(
        dispute.subtotal_amount,
        dispute.delivery_fee_amount,
      );

      await tx.run(
        `UPDATE payment_transactions
         SET status = 'released', processed_at = CURRENT_TIMESTAMP
         WHERE order_id = ? AND status = 'held'`,
        [dispute.order_id],
      );

      await tx.run(
        `UPDATE orders
         SET payment_status = 'paid', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [dispute.order_id],
      );

      await insertFinancialLedgerEntry(
        {
          orderId: dispute.order_id,
          entryType: "escrow_release",
          partyType: "platform",
          amount: settlement.totalSettledAmount,
          currency: dispute.currency,
          note: resolutionNote || "Owner released escrow after dispute review",
        },
        tx,
      );
      await insertFinancialLedgerEntry(
        {
          orderId: dispute.order_id,
          entryType: "platform_fee",
          partyType: "platform",
          amount: settlement.platformFeeAmount,
          currency: dispute.currency,
          note: "Platform fee settlement",
        },
        tx,
      );
      await insertFinancialLedgerEntry(
        {
          orderId: dispute.order_id,
          entryType: "merchant_payout",
          partyType: "merchant",
          partyId: dispute.merchant_id,
          amount: settlement.merchantPayoutAmount,
          currency: dispute.currency,
          note: "Merchant payout due",
        },
        tx,
      );
      await insertFinancialLedgerEntry(
        {
          orderId: dispute.order_id,
          entryType: "driver_payout",
          partyType: "driver",
          partyId: dispute.driver_id,
          amount: settlement.driverPayoutAmount,
          currency: dispute.currency,
          note: "Driver payout due",
        },
        tx,
      );
    }

    await tx.run(
      `UPDATE order_disputes
       SET status = 'resolved',
           resolution = ?,
           resolution_note = ?,
           resolved_by_user_id = ?,
           updated_at = CURRENT_TIMESTAMP,
           resolved_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [resolution, resolutionNote || null, session.id, dispute.id],
    );
  });

  await writeAuditLog(session.id, `dispute_resolved_${resolution}`, "order", dispute.order_id);
  revalidateOrderViews(dispute.order_id);
}

export async function assignDriverToOrder(formData: FormData) {
  const session = await requireSessionUser();
  if (!session.ownerAccess && session.role !== "admin") return;

  const orderId = String(formData.get("orderId") ?? "").trim();
  const driverId = String(formData.get("driverId") ?? "").trim();
  if (!orderId || !driverId) return;

  const order = await getAssignableOrder(orderId);
  if (!order || ["cancelled", "delivered", "picked_up"].includes(order.status)) return;

  const db = await getDbExecutor();
  const driver = await db.get<{ id: string }>(
    `SELECT id
     FROM driver_profiles
     WHERE id = ?
       AND is_verified = true
     LIMIT 1`,
    [driverId],
  );
  if (!driver) return;

  await db.run(
    `UPDATE orders
     SET driver_id = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [driver.id, order.id],
  );

  await writeAuditLog(session.id, "owner_assigned_driver", "order", order.id);
  revalidateOrderViews(order.id);
}

export async function autoAssignDriverToOrder(formData: FormData) {
  const session = await requireSessionUser();
  if (!session.ownerAccess && session.role !== "admin") return;

  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) return;

  const order = await getAssignableOrder(orderId);
  if (!order || ["cancelled", "delivered", "picked_up"].includes(order.status)) return;

  const driver = await getBestFitDriver();
  if (!driver) return;

  const db = await getDbExecutor();
  await db.run(
    `UPDATE orders
     SET driver_id = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [driver.id, order.id],
  );

  await writeAuditLog(session.id, "owner_auto_assigned_driver", "order", order.id);
  revalidateOrderViews(order.id);
}
