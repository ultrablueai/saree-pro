import type { SessionUser } from "@/lib/auth";
import { getDbExecutor } from "@/lib/db";

export interface OrderDetailData {
  order: {
    id: string;
    orderCode: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    subtotalAmount: number;
    deliveryFeeAmount: number;
    totalAmount: number;
    currency: string;
    specialInstructions: string | null;
    createdAt: string;
    confirmedAt: string | null;
    deliveredAt: string | null;
  };
  workflow: {
    stageIndex: number;
    stageLabel: string;
    paymentLabel: string;
    openDisputesCount: number;
    resolvedDisputesCount: number;
    hasFinancialRelease: boolean;
  };
  customer: { id: string; name: string; email: string };
  merchant: { id: string; name: string };
  driver:
    | { id: string; name: string; availability: string; vehicleType: string }
    | null;
  availableDrivers: Array<{
    id: string;
    name: string;
    availability: string;
    vehicleType: string;
    activeOrderCount: number;
  }>;
  recommendedDriver:
    | {
        id: string;
        name: string;
        reason: string;
      }
    | null;
  address: {
    street: string;
    building: string;
    floor: string | null;
    apartment: string | null;
    district: string | null;
    city: string;
    notes: string | null;
  };
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPriceAmount: number;
    totalPriceAmount: number;
  }>;
  paymentTransactions: Array<{
    id: string;
    status: string;
    amount: number;
    currency: string;
    provider: string;
    providerRef: string | null;
    processedAt: string | null;
    createdAt: string;
  }>;
  settlementEntries: Array<{
    id: string;
    entryType: string;
    partyType: string;
    amount: number;
    currency: string;
    note: string | null;
    createdAt: string;
  }>;
  disputes: Array<{
    id: string;
    openedByRole: string;
    reason: string;
    details: string | null;
    status: string;
    resolution: string | null;
    resolutionNote: string | null;
    createdAt: string;
    resolvedAt: string | null;
  }>;
  existingReview: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
  } | null;
  canReview: boolean;
  timeline: Array<{
    key: string;
    kind: "order" | "payment" | "delivery" | "dispute" | "finance";
    label: string;
    detail: string;
    createdAt: string;
  }>;
}

const orderStageLabels: Record<string, string> = {
  pending: "Order placed",
  confirmed: "Merchant confirmed",
  preparing: "Kitchen preparing",
  ready: "Ready for driver",
  picked_up: "Picked up",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const paymentStatusLabels: Record<string, string> = {
  held: "Held in escrow",
  released: "Released",
  refunded: "Refunded",
  paid: "Paid",
  unpaid: "Unpaid",
  authorized: "Authorized",
  failed: "Failed",
};

type TimelineEvent = OrderDetailData["timeline"][number];

function buildTimeline(
  order: OrderDetailData["order"],
  paymentTransactions: OrderDetailData["paymentTransactions"],
  settlementEntries: OrderDetailData["settlementEntries"],
  disputes: OrderDetailData["disputes"],
  auditLogs: Array<{ action: string; created_at: string }>,
) {
  const events: TimelineEvent[] = [
    {
      key: "order_created",
      kind: "order",
      label: "Order created",
      detail: "Customer submitted the order.",
      createdAt: order.createdAt,
    },
  ];

  if (order.confirmedAt) {
    events.push({
      key: "order_confirmed",
      kind: "order",
      label: "Order confirmed",
      detail: "Merchant accepted the order.",
      createdAt: order.confirmedAt,
    });
  }

  const actionLabels: Record<string, { label: string; kind: TimelineEvent["kind"]; detail: string }> = {
    owner_assigned_driver: {
      label: "Driver assigned",
      kind: "delivery",
      detail: "Owner assigned a driver to the order.",
    },
    owner_auto_assigned_driver: {
      label: "Driver auto-assigned",
      kind: "delivery",
      detail: "Owner used the dispatch recommendation to assign a driver.",
    },
    merchant_order_preparing: {
      label: "Preparation started",
      kind: "order",
      detail: "Kitchen switched the order to preparation.",
    },
    merchant_order_ready: {
      label: "Order ready",
      kind: "delivery",
      detail: "Merchant marked the order ready for pickup.",
    },
    merchant_order_cancelled: {
      label: "Order cancelled",
      kind: "order",
      detail: "Merchant cancelled the order.",
    },
    driver_claimed_order: {
      label: "Trip started",
      kind: "delivery",
      detail: "Driver started the trip for this order.",
    },
    driver_completed_order: {
      label: "Delivery confirmed",
      kind: "delivery",
      detail: "Driver confirmed successful delivery.",
    },
    dispute_opened: {
      label: "Dispute opened",
      kind: "dispute",
      detail: "A role opened a dispute for this order.",
    },
    dispute_resolved_refund_customer: {
      label: "Dispute resolved",
      kind: "dispute",
      detail: "Owner resolved the dispute by refunding the customer.",
    },
    dispute_resolved_release_funds: {
      label: "Dispute resolved",
      kind: "finance",
      detail: "Owner resolved the dispute by releasing funds.",
    },
    dispute_resolved_dismiss: {
      label: "Dispute dismissed",
      kind: "dispute",
      detail: "Owner dismissed the dispute.",
    },
  };

  for (const entry of auditLogs) {
    const action = actionLabels[entry.action];
    if (!action) continue;
    events.push({
      key: `${entry.action}-${entry.created_at}`,
      kind: action.kind,
      label: action.label,
      detail: action.detail,
      createdAt: entry.created_at,
    });
  }

  for (const tx of paymentTransactions) {
    events.push({
      key: `payment-${tx.id}`,
      kind: "payment",
      label: paymentStatusLabels[tx.status] ?? tx.status,
      detail: `${tx.provider}${tx.providerRef ? ` • ${tx.providerRef}` : ""}`,
      createdAt: tx.createdAt,
    });
  }

  for (const entry of settlementEntries) {
    events.push({
      key: `settlement-${entry.id}`,
      kind: "finance",
      label: entry.entryType,
      detail: entry.note ?? `${entry.partyType} settlement entry`,
      createdAt: entry.createdAt,
    });
  }

  for (const dispute of disputes) {
    events.push({
      key: `dispute-${dispute.id}`,
      kind: "dispute",
      label: dispute.status === "open" ? "Dispute opened" : "Dispute resolved",
      detail: dispute.reason,
      createdAt: dispute.createdAt,
    });

    if (dispute.resolvedAt) {
      events.push({
        key: `dispute-resolution-${dispute.id}`,
        kind: "dispute",
        label: dispute.resolution ? `Resolution: ${dispute.resolution}` : "Resolution recorded",
        detail: dispute.resolutionNote ?? "Owner reviewed the dispute.",
        createdAt: dispute.resolvedAt,
      });
    }
  }

  if (order.deliveredAt) {
    events.push({
      key: "order_delivered",
      kind: "delivery",
      label: "Delivered",
      detail: "Order completed and marked delivered.",
      createdAt: order.deliveredAt,
    });
  }

  return events.sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

export async function getOrderDetailsForSession(
  session: SessionUser,
  orderId: string,
): Promise<OrderDetailData | null> {
  const db = await getDbExecutor();
  const orderRow = await db.get<{
    id: string;
    order_code: string;
    status: string;
    payment_status: string;
    payment_method: string;
    subtotal_amount: number;
    delivery_fee_amount: number;
    total_amount: number;
    currency: string;
    special_instructions: string | null;
    created_at: string;
    confirmed_at: string | null;
    delivered_at: string | null;
    customer_id: string;
    merchant_id: string;
    driver_id: string | null;
    customer_name: string;
    customer_email: string;
    merchant_name: string;
    driver_user_id: string | null;
    driver_name: string | null;
    driver_availability: string | null;
    driver_vehicle_type: string | null;
    street: string;
    building: string;
    floor: string | null;
    apartment: string | null;
    district: string | null;
    city: string;
    notes: string | null;
  }>(
    `SELECT
        o.id,
        o.order_code,
        o.status,
        o.payment_status,
        o.payment_method,
        o.subtotal_amount,
        o.delivery_fee_amount,
        o.total_amount,
        o.currency,
        o.special_instructions,
        o.created_at,
        o.confirmed_at,
        o.delivered_at,
        o.customer_id,
        o.merchant_id,
        o.driver_id,
        c.full_name AS customer_name,
        c.email AS customer_email,
        m.name AS merchant_name,
        dp.user_id AS driver_user_id,
        du.full_name AS driver_name,
        dp.availability AS driver_availability,
        dp.vehicle_type AS driver_vehicle_type,
        a.street,
        a.building,
        a.floor,
        a.apartment,
        a.district,
        a.city,
        a.notes
     FROM orders o
     INNER JOIN app_users c ON c.id = o.customer_id
     INNER JOIN merchants m ON m.id = o.merchant_id
     INNER JOIN addresses a ON a.id = o.delivery_address_id
     LEFT JOIN driver_profiles dp ON dp.id = o.driver_id
     LEFT JOIN app_users du ON du.id = dp.user_id
     WHERE o.id = ?
     LIMIT 1`,
    [orderId],
  );

  if (!orderRow) return null;

  const isOwner = session.ownerAccess || session.role === "admin";
  const isCustomer = session.role === "customer" && orderRow.customer_id === session.id;
  const isMerchant =
    session.role === "merchant" &&
    Boolean(
      await db.get(
        "SELECT 1 FROM merchants WHERE id = ? AND owner_user_id = ? LIMIT 1",
        [orderRow.merchant_id, session.id],
      ),
    );
  const isDriver = session.role === "driver" && orderRow.driver_user_id === session.id;

  if (!isOwner && !isCustomer && !isMerchant && !isDriver) return null;

  const items = await db.all<{
    id: string;
    menu_item_name: string;
    quantity: number;
    unit_price_amount: number;
    total_price_amount: number;
  }>(
    `SELECT id, menu_item_name, quantity, unit_price_amount, total_price_amount
     FROM order_items
     WHERE order_id = ?
     ORDER BY menu_item_name ASC, id ASC`,
    [orderId],
  );

  const paymentTransactions = await db.all<{
    id: string;
    status: string;
    amount: number;
    currency: string;
    provider: string;
    provider_ref: string | null;
    processed_at: string | null;
    created_at: string;
  }>(
    `SELECT id, status, amount, currency, provider, provider_ref, processed_at, created_at
     FROM payment_transactions
     WHERE order_id = ?
     ORDER BY created_at ASC`,
    [orderId],
  );

  const settlementEntries = await db.all<{
    id: string;
    entry_type: string;
    party_type: string;
    amount: number;
    currency: string;
    note: string | null;
    created_at: string;
  }>(
    `SELECT id, entry_type, party_type, amount, currency, note, created_at
     FROM financial_ledger_entries
     WHERE order_id = ?
     ORDER BY created_at ASC`,
    [orderId],
  );

  const disputes = await db.all<{
    id: string;
    opened_by_role: string;
    reason: string;
    details: string | null;
    status: string;
    resolution: string | null;
    resolution_note: string | null;
    created_at: string;
    resolved_at: string | null;
  }>(
    `SELECT id, opened_by_role, reason, details, status, resolution, resolution_note, created_at, resolved_at
     FROM order_disputes
     WHERE order_id = ?
     ORDER BY created_at DESC`,
    [orderId],
  );

  const existingReview = await db.get<{
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
  }>(
    `SELECT id, rating, comment, created_at
     FROM reviews
     WHERE order_id = ?
     LIMIT 1`,
    [orderId],
  );

  const auditLogs = await db.all<{ action: string; created_at: string }>(
    `SELECT action, created_at
     FROM audit_logs
     WHERE entity_type = 'order' AND entity_id = ?
     ORDER BY created_at ASC`,
    [orderId],
  );

  const availableDrivers = isOwner
    ? await db.all<{
        id: string;
        driver_name: string;
        availability: string;
        vehicle_type: string;
        active_order_count: number;
      }>(
        `SELECT
            dp.id,
            du.full_name AS driver_name,
            dp.availability,
            dp.vehicle_type,
            CAST(COUNT(active_orders.id) AS INTEGER) AS active_order_count
         FROM driver_profiles dp
         INNER JOIN app_users du ON du.id = dp.user_id
         LEFT JOIN orders active_orders
           ON active_orders.driver_id = dp.id
          AND active_orders.status IN ('ready', 'picked_up')
         WHERE dp.is_verified = true OR dp.id = ?
         GROUP BY dp.id, du.full_name, dp.availability, dp.vehicle_type
         ORDER BY
           CASE dp.availability
             WHEN 'available' THEN 1
             WHEN 'on_delivery' THEN 2
             ELSE 3
           END,
           active_order_count ASC,
           du.full_name ASC
         LIMIT 10`,
        [orderRow.driver_id],
      )
    : [];

  const latestPaymentStatus =
    paymentTransactions.length > 0
      ? paymentTransactions[paymentTransactions.length - 1].status
      : orderRow.payment_status;
  const openDisputesCount = disputes.filter((entry) => entry.status === "open").length;
  const resolvedDisputesCount = disputes.filter((entry) => entry.status === "resolved").length;
  const hasFinancialRelease = paymentTransactions.some((entry) => entry.status === "released");
  const recommendedDriver = availableDrivers[0]
    ? {
        id: availableDrivers[0].id,
        name: availableDrivers[0].driver_name,
        reason:
          availableDrivers[0].availability === "available"
            ? "Available now with the lightest active load."
            : "Best current workload fit among verified drivers.",
      }
    : null;

  return {
    order: {
      id: orderRow.id,
      orderCode: orderRow.order_code,
      status: orderRow.status,
      paymentStatus: orderRow.payment_status,
      paymentMethod: orderRow.payment_method,
      subtotalAmount: orderRow.subtotal_amount,
      deliveryFeeAmount: orderRow.delivery_fee_amount,
      totalAmount: orderRow.total_amount,
      currency: orderRow.currency,
      specialInstructions: orderRow.special_instructions,
      createdAt: orderRow.created_at,
      confirmedAt: orderRow.confirmed_at,
      deliveredAt: orderRow.delivered_at,
    },
    workflow: {
      stageIndex: ["pending", "confirmed", "preparing", "ready", "picked_up", "delivered"].indexOf(
        orderRow.status,
      ),
      stageLabel: orderStageLabels[orderRow.status] ?? orderRow.status,
      paymentLabel: paymentStatusLabels[latestPaymentStatus] ?? latestPaymentStatus,
      openDisputesCount,
      resolvedDisputesCount,
      hasFinancialRelease,
    },
    customer: {
      id: orderRow.customer_id,
      name: orderRow.customer_name,
      email: orderRow.customer_email,
    },
    merchant: { id: orderRow.merchant_id, name: orderRow.merchant_name },
    driver: orderRow.driver_id
      ? {
          id: orderRow.driver_id,
          name: orderRow.driver_name ?? "Assigned driver",
          availability: orderRow.driver_availability ?? "unknown",
          vehicleType: orderRow.driver_vehicle_type ?? "vehicle",
        }
      : null,
    availableDrivers: availableDrivers.map((driver) => ({
      id: driver.id,
      name: driver.driver_name,
      availability: driver.availability,
      vehicleType: driver.vehicle_type,
      activeOrderCount: driver.active_order_count,
    })),
    recommendedDriver,
    address: {
      street: orderRow.street,
      building: orderRow.building,
      floor: orderRow.floor,
      apartment: orderRow.apartment,
      district: orderRow.district,
      city: orderRow.city,
      notes: orderRow.notes,
    },
    items: items.map((item) => ({
      id: item.id,
      name: item.menu_item_name,
      quantity: item.quantity,
      unitPriceAmount: item.unit_price_amount,
      totalPriceAmount: item.total_price_amount,
    })),
    paymentTransactions: paymentTransactions.map((entry) => ({
      id: entry.id,
      status: entry.status,
      amount: entry.amount,
      currency: entry.currency,
      provider: entry.provider,
      providerRef: entry.provider_ref,
      processedAt: entry.processed_at,
      createdAt: entry.created_at,
    })),
    settlementEntries: settlementEntries.map((entry) => ({
      id: entry.id,
      entryType: entry.entry_type,
      partyType: entry.party_type,
      amount: entry.amount,
      currency: entry.currency,
      note: entry.note,
      createdAt: entry.created_at,
    })),
    disputes: disputes.map((entry) => ({
      id: entry.id,
      openedByRole: entry.opened_by_role,
      reason: entry.reason,
      details: entry.details,
      status: entry.status,
      resolution: entry.resolution,
      resolutionNote: entry.resolution_note,
      createdAt: entry.created_at,
      resolvedAt: entry.resolved_at,
    })),
    existingReview: existingReview
      ? {
          id: existingReview.id,
          rating: existingReview.rating,
          comment: existingReview.comment,
          createdAt: existingReview.created_at,
        }
      : null,
    canReview: isCustomer && orderRow.status === "delivered" && !existingReview,
    timeline: buildTimeline(
      {
        id: orderRow.id,
        orderCode: orderRow.order_code,
        status: orderRow.status,
        paymentStatus: orderRow.payment_status,
        paymentMethod: orderRow.payment_method,
        subtotalAmount: orderRow.subtotal_amount,
        deliveryFeeAmount: orderRow.delivery_fee_amount,
        totalAmount: orderRow.total_amount,
        currency: orderRow.currency,
        specialInstructions: orderRow.special_instructions,
        createdAt: orderRow.created_at,
        confirmedAt: orderRow.confirmed_at,
        deliveredAt: orderRow.delivered_at,
      },
      paymentTransactions.map((entry) => ({
        id: entry.id,
        status: entry.status,
        amount: entry.amount,
        currency: entry.currency,
        provider: entry.provider,
        providerRef: entry.provider_ref,
        processedAt: entry.processed_at,
        createdAt: entry.created_at,
      })),
      settlementEntries.map((entry) => ({
        id: entry.id,
        entryType: entry.entry_type,
        partyType: entry.party_type,
        amount: entry.amount,
        currency: entry.currency,
        note: entry.note,
        createdAt: entry.created_at,
      })),
      disputes.map((entry) => ({
        id: entry.id,
        openedByRole: entry.opened_by_role,
        reason: entry.reason,
        details: entry.details,
        status: entry.status,
        resolution: entry.resolution,
        resolutionNote: entry.resolution_note,
        createdAt: entry.created_at,
        resolvedAt: entry.resolved_at,
      })),
      auditLogs,
    ),
  };
}
