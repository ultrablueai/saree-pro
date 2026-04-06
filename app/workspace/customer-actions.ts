"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/auth";
import { getDbExecutor, withTransaction } from "@/lib/db";
import { insertFinancialLedgerEntry } from "@/lib/financials";

export interface CustomerOrderActionState {
  status: "idle" | "success" | "error";
  message: string;
  orderCode?: string;
}

const validPaymentMethods = new Set(["cash", "card", "wallet"]);

function generateOrderCode() {
  return `SP-${Date.now().toString(36).toUpperCase()}-${randomBytes(2)
    .toString("hex")
    .toUpperCase()}`;
}

export async function placeCustomerOrder(
  _state: CustomerOrderActionState,
  formData: FormData,
): Promise<CustomerOrderActionState> {
  const session = await requireSessionUser();

  if (session.role !== "customer") {
    return {
      status: "error",
      message: "Only customer accounts can place orders from this panel.",
    };
  }

  const merchantId = String(formData.get("merchantId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const paymentMethod = String(formData.get("paymentMethod") ?? "cash").trim();

  if (!merchantId) {
    return {
      status: "error",
      message: "A merchant is required to place an order.",
    };
  }

  if (!validPaymentMethods.has(paymentMethod)) {
    return {
      status: "error",
      message: "Please choose a valid payment method.",
    };
  }

  const db = await getDbExecutor();
  const merchant = await db.get<{
    id: string;
    name: string;
    delivery_fee_amount: number;
    minimum_order_amount: number;
    currency: string;
    status: string;
  }>(
    `SELECT id, name, delivery_fee_amount, minimum_order_amount, currency, status
     FROM merchants
     WHERE id = ?
     LIMIT 1`,
    [merchantId],
  );

  if (!merchant || merchant.status !== "active") {
    return {
      status: "error",
      message: "The selected merchant is not available right now.",
    };
  }

  const address = await db.get<{ id: string }>(
    `SELECT id
     FROM addresses
     WHERE user_id = ?
     ORDER BY is_default DESC, created_at ASC
     LIMIT 1`,
    [session.id],
  );

  if (!address) {
    return {
      status: "error",
      message: "Please add a delivery address before placing an order.",
    };
  }

  const items = await db.all<{
    id: string;
    name: string;
    price_amount: number;
    currency: string;
    is_available: number;
  }>(
    `SELECT mi.id, mi.name, mi.price_amount, mi.currency, mi.is_available::int as is_available
     FROM menu_items mi
     WHERE mi.merchant_id = ?
     ORDER BY mi.sort_order ASC, mi.created_at DESC`,
    [merchant.id],
  );

  const selectedItems = items
    .map((item) => {
      const quantity = Number(formData.get(`qty_${item.id}`) ?? "0");
      return {
        ...item,
        quantity: Number.isNaN(quantity) ? 0 : quantity,
      };
    })
    .filter((item) => item.quantity > 0);

  if (selectedItems.length === 0) {
    return {
      status: "error",
      message: "Select at least one item and quantity.",
    };
  }

  const unavailableItem = selectedItems.find((item) => !item.is_available);
  if (unavailableItem) {
    return {
      status: "error",
      message: `${unavailableItem.name} is currently unavailable.`,
    };
  }

  const subtotalAmount = selectedItems.reduce(
    (sum, item) => sum + item.price_amount * item.quantity,
    0,
  );

  if (subtotalAmount < merchant.minimum_order_amount) {
    return {
      status: "error",
      message: "This order does not meet the merchant minimum order amount.",
    };
  }

  const deliveryFeeAmount = merchant.delivery_fee_amount;
  const totalAmount = subtotalAmount + deliveryFeeAmount;
  const orderCode = generateOrderCode();
  const orderId = randomBytes(16).toString("hex");
  const paymentTransactionId = randomBytes(16).toString("hex");
  const now = new Date().toISOString();

  await withTransaction(async (tx) => {
    await tx.run(
      `INSERT INTO orders (
        id, order_code, customer_id, merchant_id, driver_id, delivery_address_id,
        status, payment_method, payment_status, subtotal_amount, delivery_fee_amount,
        discount_amount, total_amount, currency, special_instructions,
        estimated_delivery_time, confirmed_at, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, NULL, ?, 'pending', ?, 'unpaid', ?, ?, 0, ?, ?, ?, NULL, NULL, ?, ?
      )`,
      [
        orderId,
        orderCode,
        session.id,
        merchant.id,
        address.id,
        paymentMethod,
        subtotalAmount,
        deliveryFeeAmount,
        totalAmount,
        merchant.currency,
        note || null,
        now,
        now,
      ],
    );

    for (const item of selectedItems) {
      await tx.run(
        `INSERT INTO order_items (
          id, order_id, menu_item_id, menu_item_name, quantity,
          unit_price_amount, total_price_amount, selected_options_json, special_instructions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)`,
        [
          randomBytes(16).toString("hex"),
          orderId,
          item.id,
          item.name,
          item.quantity,
          item.price_amount,
          item.price_amount * item.quantity,
        ],
      );
    }

    await tx.run(
      `INSERT INTO payment_transactions (
        id, order_id, provider, provider_ref, amount, currency, status, processed_at, failure_reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
      [
        paymentTransactionId,
        orderId,
        "local_escrow",
        `${paymentMethod}:${orderCode}`,
        totalAmount,
        merchant.currency,
        "held",
        now,
        now,
      ],
    );

    await insertFinancialLedgerEntry(
      {
        orderId,
        entryType: "escrow_hold",
        partyType: "customer",
        partyId: session.id,
        amount: totalAmount,
        currency: merchant.currency,
        note: `Escrow hold for ${orderCode}`,
      },
      tx,
    );

    await tx.run(
      `INSERT INTO audit_logs (
        id, actor_user_id, action, entity_type, entity_id, meta_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        randomBytes(16).toString("hex"),
        session.id,
        "customer_order_created",
        "order",
        orderId,
        JSON.stringify({
          merchantId: merchant.id,
          orderCode,
          subtotalAmount,
          deliveryFeeAmount,
          totalAmount,
          itemCount: selectedItems.length,
          paymentMethod,
          paymentTransactionId,
        }),
        now,
      ],
    );
  });
  revalidatePath("/workspace");

  return {
    status: "success",
    message: `Order ${orderCode} was created successfully.`,
    orderCode,
  };
}
