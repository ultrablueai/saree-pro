import type { SessionUser } from "@/lib/auth";
import { getCustomerOrderWorkspaceData } from "@/lib/customer-order-data";
import { getNotificationsByUserId, getUnreadCount } from "@/lib/notifications";
import { getLoyaltyPointsByUserId, getWalletSummaryByUserId } from "@/lib/wallet-server";
import { getDbExecutor } from "@/lib/db";

function formatMoney(amount: number, currency = "SAR") {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function getAgeMinutes(timestamp: string) {
  const ageMs = Date.now() - new Date(timestamp).getTime();
  return Math.max(Math.floor(ageMs / 60000), 0);
}

function getOperationalAlert(status: string, ageMinutes: number, hasDriver: boolean) {
  if (status === "ready" && !hasDriver) {
    if (ageMinutes >= 20) {
      return {
        severity: "critical" as const,
        label: "Driver overdue",
        detail: "Ready order is still unassigned and needs immediate dispatch.",
      };
    }

    return {
      severity: "high" as const,
      label: "Dispatch now",
      detail: "Ready order is waiting for driver assignment.",
    };
  }

  if (status === "preparing" && ageMinutes >= 25) {
    return {
      severity: "high" as const,
      label: "Kitchen delayed",
      detail: "Preparation time is above the expected operating window.",
    };
  }

  if (status === "picked_up" && ageMinutes >= 35) {
    return {
      severity: "medium" as const,
      label: "Delivery watch",
      detail: "Trip duration is stretching and should be monitored.",
    };
  }

  if ((status === "pending" || status === "confirmed") && ageMinutes >= 15) {
    return {
      severity: "medium" as const,
      label: "Merchant attention",
      detail: "Order has been open too long without moving forward.",
    };
  }

  return {
    severity: "normal" as const,
    label: "On track",
    detail: "Order is moving within the expected service window.",
  };
}

export async function getUserAddressSummary(userId: string) {
  const db = await getDbExecutor();
  return db.get<{
    label: string | null;
    street: string;
    building: string;
    district: string | null;
    city: string;
    notes: string | null;
  }>(
    `SELECT label, street, building, district, city, notes
     FROM addresses
     WHERE user_id = ?
     ORDER BY is_default DESC, created_at ASC
     LIMIT 1`,
    [userId],
  );
}

export async function getCustomerOrders(customerId: string) {
  const db = await getDbExecutor();
  return db.all<{
    id: string;
    order_code: string;
    status: string;
    payment_status: string;
    payment_method: string;
    total_amount: number;
    currency: string;
    created_at: string;
    merchant_name: string;
    escrow_status: string | null;
  }>(
    `SELECT
       o.id,
       o.order_code,
       o.status,
       o.payment_status,
       o.payment_method,
       o.total_amount,
       o.currency,
       o.created_at,
       m.name AS merchant_name,
       pt.status AS escrow_status
     FROM orders o
     INNER JOIN merchants m ON m.id = o.merchant_id
     LEFT JOIN payment_transactions pt ON pt.order_id = o.id
     WHERE o.customer_id = ?
     ORDER BY o.created_at DESC
     LIMIT 6`,
    [customerId],
  );
}

async function getFavoriteMerchants(customerId: string) {
  const db = await getDbExecutor();
  return db.all<{
    id: string;
    name: string;
    slug: string;
    rating: number;
    order_count: number;
  }>(
    `SELECT
       m.id,
       m.name,
       m.slug,
       m.rating,
       COUNT(o.id) as order_count
     FROM orders o
     INNER JOIN merchants m ON m.id = o.merchant_id
     WHERE o.customer_id = ?
     GROUP BY m.id, m.name, m.slug, m.rating
     ORDER BY order_count DESC, m.rating DESC, m.name ASC
     LIMIT 3`,
    [customerId],
  );
}

export async function getMerchantWorkspace(userId: string) {
  const db = await getDbExecutor();
  const merchant = await db.get<{
    id: string;
    name: string;
    status: string;
    rating: number;
    delivery_fee_amount: number;
    minimum_order_amount: number;
    currency: string;
  }>(
    `SELECT id, name, status, rating, delivery_fee_amount, minimum_order_amount, currency
     FROM merchants
     WHERE owner_user_id = ?
     LIMIT 1`,
    [userId],
  );

  if (!merchant) {
    return null;
  }

  const menuCount = await db.get<{ count: number }>(
    "SELECT CAST(COUNT(*) AS INTEGER) as count FROM menu_items WHERE merchant_id = ?",
    [merchant.id],
  );
  const activeOrders = await db.get<{ count: number }>(
    `SELECT CAST(COUNT(*) AS INTEGER) as count
     FROM orders
     WHERE merchant_id = ?
     AND status IN ('pending', 'confirmed', 'preparing', 'ready')`,
    [merchant.id],
  );
  const recentOrders = await db.all<{
    id: string;
    order_code: string;
    status: string;
    total_amount: number;
    currency: string;
    created_at: string;
  }>(
    `SELECT id, order_code, status, total_amount, currency, created_at
     FROM orders
     WHERE merchant_id = ?
     ORDER BY created_at DESC
     LIMIT 6`,
    [merchant.id],
  );
  const categories = await db.all<{
    id: string;
    name: string;
    sort_order: number;
    item_count: number;
  }>(
    `SELECT c.id, c.name, c.sort_order,
            CAST(COUNT(mi.id) AS INTEGER) as item_count
     FROM menu_categories c
     LEFT JOIN menu_items mi ON mi.category_id = c.id
     WHERE c.merchant_id = ?
     GROUP BY c.id, c.name, c.sort_order
     ORDER BY c.sort_order ASC, c.name ASC`,
    [merchant.id],
  );
  const menuItems = await db.all<{
    id: string;
    name: string;
    description: string;
    price_amount: number;
    currency: string;
    is_available: number;
    sort_order: number;
    category_id: string | null;
    category_name: string;
  }>(
    `SELECT mi.id, mi.name, mi.description, mi.price_amount, mi.currency,
            CASE WHEN mi.is_available THEN 1 ELSE 0 END as is_available, mi.sort_order, mi.category_id,
            COALESCE(c.name, 'Uncategorized') as category_name
     FROM menu_items mi
     LEFT JOIN menu_categories c ON c.id = mi.category_id
     WHERE mi.merchant_id = ?
     ORDER BY mi.sort_order ASC, mi.created_at DESC`,
    [merchant.id],
  );
  const kitchenQueue = await db.all<{
    id: string;
    order_code: string;
    status: string;
    total_amount: number;
    currency: string;
    created_at: string;
    special_instructions: string | null;
    customer_name: string;
    item_count: number;
  }>(
    `SELECT
        o.id,
        o.order_code,
        o.status,
        o.total_amount,
        o.currency,
        o.created_at,
        o.special_instructions,
        u.full_name AS customer_name,
        CAST(COUNT(oi.id) AS INTEGER) AS item_count
     FROM orders o
     INNER JOIN app_users u ON u.id = o.customer_id
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.merchant_id = ?
       AND o.status IN ('pending', 'confirmed', 'preparing', 'ready')
     GROUP BY
       o.id,
       o.order_code,
       o.status,
       o.total_amount,
       o.currency,
       o.created_at,
       o.special_instructions,
       u.full_name
     ORDER BY o.created_at ASC`,
    [merchant.id],
  );

  return {
    merchant,
    menuCount: menuCount?.count ?? 0,
    activeOrders: activeOrders?.count ?? 0,
    recentOrders,
    kitchenQueue,
    categories,
    menuItems,
  };
}

export async function getDriverWorkspace(userId: string) {
  const db = await getDbExecutor();
  const driver = await db.get<{
    id: string;
    vehicle_type: string;
    is_verified: number;
    availability: string;
    license_number: string | null;
  }>(
    `SELECT id, vehicle_type, CASE WHEN is_verified THEN 1 ELSE 0 END as is_verified, availability, license_number
     FROM driver_profiles
     WHERE user_id = ?
     LIMIT 1`,
    [userId],
  );

  if (!driver) {
    return null;
  }

  const assignedOrders = await db.all<{
    id: string;
    order_code: string;
    status: string;
    total_amount: number;
    currency: string;
    created_at: string;
    special_instructions: string | null;
    merchant_name: string;
    street: string;
    building: string;
    district: string | null;
    city: string;
  }>(
    `SELECT
        o.id,
        o.order_code,
        o.status,
        o.total_amount,
        o.currency,
        o.created_at,
        o.special_instructions,
        m.name AS merchant_name,
        a.street,
        a.building,
        a.district,
        a.city
     FROM orders o
     INNER JOIN merchants m ON m.id = o.merchant_id
     INNER JOIN addresses a ON a.id = o.delivery_address_id
     WHERE o.driver_id = ?
     ORDER BY o.created_at DESC
     LIMIT 8`,
    [driver.id],
  );
  const availableOrders = await db.all<{
    id: string;
    order_code: string;
    status: string;
    total_amount: number;
    currency: string;
    created_at: string;
    merchant_name: string;
    street: string;
    building: string;
    district: string | null;
    city: string;
  }>(
    `SELECT
        o.id,
        o.order_code,
        o.status,
        o.total_amount,
        o.currency,
        o.created_at,
        m.name AS merchant_name,
        a.street,
        a.building,
        a.district,
        a.city
     FROM orders o
     INNER JOIN merchants m ON m.id = o.merchant_id
     INNER JOIN addresses a ON a.id = o.delivery_address_id
     WHERE o.driver_id IS NULL
       AND o.status = 'ready'
     ORDER BY o.created_at ASC
     LIMIT 8`,
  );

  return {
    driver,
    availableOrders,
    assignedOrders,
  };
}

export async function getOwnerWorkspace() {
  const db = await getDbExecutor();
  const grossSales = (
    await db.get<{ total: number }>(
      "SELECT CAST(COALESCE(SUM(total_amount), 0) AS INTEGER) as total FROM orders",
    )
  )?.total ?? 0;
  const heldEscrow = (
    await db.get<{ total: number }>(
      "SELECT CAST(COALESCE(SUM(amount), 0) AS INTEGER) as total FROM payment_transactions WHERE status = 'held'",
    )
  )?.total ?? 0;
  const releasedFunds = (
    await db.get<{ total: number }>(
      "SELECT CAST(COALESCE(SUM(amount), 0) AS INTEGER) as total FROM payment_transactions WHERE status = 'released'",
    )
  )?.total ?? 0;
  const merchantPayouts = (
    await db.get<{ total: number }>(
      "SELECT CAST(COALESCE(SUM(amount), 0) AS INTEGER) as total FROM financial_ledger_entries WHERE entry_type = 'merchant_payout'",
    )
  )?.total ?? 0;
  const driverPayouts = (
    await db.get<{ total: number }>(
      "SELECT CAST(COALESCE(SUM(amount), 0) AS INTEGER) as total FROM financial_ledger_entries WHERE entry_type = 'driver_payout'",
    )
  )?.total ?? 0;
  const refundedAmount = (
    await db.get<{ total: number }>(
      "SELECT CAST(COALESCE(SUM(amount), 0) AS INTEGER) as total FROM financial_ledger_entries WHERE entry_type = 'refund'",
    )
  )?.total ?? 0;
  const pendingOrders = (
    await db.get<{ count: number }>(
      "SELECT CAST(COUNT(*) AS INTEGER) as count FROM orders WHERE status IN ('pending', 'confirmed', 'preparing', 'ready')",
    )
  )?.count ?? 0;
  const activeDrivers = (
    await db.get<{ count: number }>(
      "SELECT CAST(COUNT(*) AS INTEGER) as count FROM driver_profiles WHERE availability IN ('available', 'on_delivery')",
    )
  )?.count ?? 0;

  const operationalOrders = await db.all<{
    id: string;
    order_code: string;
    status: string;
    payment_status: string;
    total_amount: number;
    currency: string;
    created_at: string;
    customer_name: string;
    merchant_name: string;
    driver_name: string;
  }>(
    `SELECT
        o.id,
        o.order_code,
        o.status,
        o.payment_status,
        o.total_amount,
        o.currency,
        o.created_at,
        c.full_name AS customer_name,
        m.name AS merchant_name,
        COALESCE(du.full_name, 'Unassigned') AS driver_name
     FROM orders o
     INNER JOIN app_users c ON c.id = o.customer_id
     INNER JOIN merchants m ON m.id = o.merchant_id
     LEFT JOIN driver_profiles dp ON dp.id = o.driver_id
     LEFT JOIN app_users du ON du.id = dp.user_id
     WHERE o.status IN ('pending', 'confirmed', 'preparing', 'ready', 'picked_up')
     ORDER BY
       CASE o.status
         WHEN 'pending' THEN 1
         WHEN 'confirmed' THEN 2
         WHEN 'preparing' THEN 3
         WHEN 'ready' THEN 4
         WHEN 'picked_up' THEN 5
         ELSE 6
       END,
       o.created_at ASC
     LIMIT 12`,
  );

  const operationalOrdersWithAlerts = operationalOrders.map((order) => {
    const ageMinutes = getAgeMinutes(order.created_at);
    const hasDriver = order.driver_name !== "Unassigned";
    const alert = getOperationalAlert(order.status, ageMinutes, hasDriver);

    return {
      ...order,
      age_minutes: ageMinutes,
      alert_severity: alert.severity,
      alert_label: alert.label,
      alert_detail: alert.detail,
      driver_assigned: hasDriver ? 1 : 0,
    };
  });

  const attentionAlerts = operationalOrdersWithAlerts
    .filter((order) => order.alert_severity !== "normal")
    .sort((left, right) => {
      const weight = { critical: 3, high: 2, medium: 1 } as const;
      const severityDiff =
        weight[right.alert_severity as keyof typeof weight] -
        weight[left.alert_severity as keyof typeof weight];
      if (severityDiff !== 0) {
        return severityDiff;
      }

      return right.age_minutes - left.age_minutes;
    })
    .slice(0, 6)
    .map((order) => ({
      order_id: order.id,
      order_code: order.order_code,
      severity: order.alert_severity as "medium" | "high" | "critical",
      label: order.alert_label,
      detail: order.alert_detail,
      age_minutes: order.age_minutes,
      status: order.status,
    }));

  const paymentLedger = await db.all<{
    created_at: string;
    status: string;
    amount: number;
    currency: string;
    provider: string;
    order_code: string;
  }>(
    `SELECT
        pt.created_at,
        pt.status,
        pt.amount,
        pt.currency,
        pt.provider,
        o.order_code
     FROM payment_transactions pt
     INNER JOIN orders o ON o.id = pt.order_id
     ORDER BY pt.created_at DESC
     LIMIT 8`,
  );

  const settlementLedger = await db.all<{
    created_at: string;
    entry_type: string;
    party_type: string;
    amount: number;
    currency: string;
    note: string | null;
    order_code: string;
  }>(
    `SELECT
        fle.created_at,
        fle.entry_type,
        fle.party_type,
        fle.amount,
        fle.currency,
        fle.note,
        o.order_code
     FROM financial_ledger_entries fle
     INNER JOIN orders o ON o.id = fle.order_id
     ORDER BY fle.created_at DESC
     LIMIT 12`,
  );

  const auditLogs = await db.all<{
    created_at: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
  }>(
    `SELECT created_at, action, entity_type, entity_id
     FROM audit_logs
     ORDER BY created_at DESC
     LIMIT 8`,
  );
  const openDisputes = await db.all<{
    id: string;
    order_id: string;
    reason: string;
    status: string;
    created_at: string;
    order_code: string;
  }>(
    `SELECT
        d.id,
        d.order_id,
        d.reason,
        d.status,
        d.created_at,
        o.order_code
     FROM order_disputes d
     INNER JOIN orders o ON o.id = d.order_id
     WHERE d.status = 'open'
     ORDER BY d.created_at DESC
     LIMIT 8`,
  );

  return {
    metrics: {
      grossSales: formatMoney(grossSales),
      platformFees: formatMoney(Math.round(grossSales * 0.12)),
      heldEscrow: formatMoney(heldEscrow),
      releasedFunds: formatMoney(releasedFunds),
      merchantPayouts: formatMoney(merchantPayouts),
      driverPayouts: formatMoney(driverPayouts),
      refundedAmount: formatMoney(refundedAmount),
      pendingOrders,
      activeDrivers,
      operationalOrders: operationalOrdersWithAlerts.length,
      highPriorityAlerts: attentionAlerts.filter((alert) => alert.severity !== "medium").length,
      criticalAlerts: attentionAlerts.filter((alert) => alert.severity === "critical").length,
    },
    operationalOrders: operationalOrdersWithAlerts,
    attentionAlerts,
    paymentLedger,
    settlementLedger,
    openDisputes,
    auditLogs,
  };
}

export async function getWorkspaceSummary(session: SessionUser) {
  if (session.ownerAccess) {
    return { type: "owner" as const, data: await getOwnerWorkspace() };
  }

  if (session.role === "customer") {
    const [
      address,
      orders,
      ordering,
      notifications,
      unreadNotifications,
      favoriteMerchants,
      wallet,
      loyaltyPoints,
    ] = await Promise.all([
      getUserAddressSummary(session.id),
      getCustomerOrders(session.id),
      getCustomerOrderWorkspaceData(session.id),
      getNotificationsByUserId(session.id, 4),
      getUnreadCount(session.id),
      getFavoriteMerchants(session.id),
      getWalletSummaryByUserId(session.id),
      getLoyaltyPointsByUserId(session.id),
    ]);

    return {
      type: "customer" as const,
      data: {
        address,
        orders,
        ordering,
        notifications,
        unreadNotifications,
        favoriteMerchants,
        wallet,
        loyaltyPoints,
      },
    };
  }

  if (session.role === "merchant") {
    return { type: "merchant" as const, data: await getMerchantWorkspace(session.id) };
  }

  if (session.role === "driver") {
    return { type: "driver" as const, data: await getDriverWorkspace(session.id) };
  }

  return { type: "admin" as const, data: await getOwnerWorkspace() };
}
