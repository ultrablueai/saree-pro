import type { SessionUser } from "@/lib/auth";
import { getDbExecutor } from "@/lib/db";

export interface OrderListItem {
  id: string;
  orderCode: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  customerName: string;
  merchantName: string;
  driverId: string | null;
  driverName: string | null;
  disputeStatus: string | null;
  disputeId: string | null;
  dispatchPriority: "dispatch_now" | "watch" | "normal";
  recommendedDriverName: string | null;
  recommendedDriverId: string | null;
}

export interface OrderListData {
  items: OrderListItem[];
  availableDrivers: Array<{
    id: string;
    name: string;
    availability: string;
    vehicleType: string;
    activeOrderCount: number;
  }>;
  filters: {
    status: string;
    dispute: string;
    assignment: string;
  };
  totals: {
    totalOrders: number;
    openOrders: number;
    disputedOrders: number;
    unassignedOrders: number;
    readyForPickupOrders: number;
  };
}

function buildWhereClause(
  session: SessionUser,
  status: string,
  dispute: string,
  assignment: string,
) {
  const conditions: string[] = [];
  const params: string[] = [];

  if (!(session.ownerAccess || session.role === "admin")) {
    if (session.role === "customer") {
      conditions.push("o.customer_id = ?");
      params.push(session.id);
    } else if (session.role === "merchant") {
      conditions.push("m.owner_user_id = ?");
      params.push(session.id);
    } else if (session.role === "driver") {
      conditions.push("dp.user_id = ?");
      params.push(session.id);
    }
  }

  if (status && status !== "all") {
    conditions.push("o.status = ?");
    params.push(status);
  }

  if (dispute === "open") {
    conditions.push("od.status = 'open'");
  } else if (dispute === "resolved") {
    conditions.push("od.status = 'resolved'");
  } else if (dispute === "none") {
    conditions.push("od.id IS NULL");
  }

  if (assignment === "unassigned") {
    conditions.push("o.driver_id IS NULL");
  } else if (assignment === "assigned") {
    conditions.push("o.driver_id IS NOT NULL");
  }

  return {
    whereSql: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

const latestDisputeJoin = `
  LEFT JOIN order_disputes od
    ON od.id = (
      SELECT od2.id
      FROM order_disputes od2
      WHERE od2.order_id = o.id
      ORDER BY od2.created_at DESC, od2.id DESC
      LIMIT 1
    )
`;

export async function getOrderListForSession(
  session: SessionUser,
  filters: { status?: string; dispute?: string; assignment?: string },
): Promise<OrderListData> {
  const db = await getDbExecutor();
  const status = filters.status?.trim() || "all";
  const dispute = filters.dispute?.trim() || "all";
  const assignment = filters.assignment?.trim() || "all";
  const { whereSql, params } = buildWhereClause(session, status, dispute, assignment);

  const items = await db.all<{
    id: string;
    order_code: string;
    status: string;
    payment_status: string;
    driver_id: string | null;
    total_amount: number;
    currency: string;
    created_at: string;
    customer_name: string;
    merchant_name: string;
    driver_name: string | null;
    dispute_id: string | null;
    dispute_status: string | null;
  }>(
    `SELECT
        o.id,
        o.order_code,
        o.status,
        o.payment_status,
        o.driver_id,
        o.total_amount,
        o.currency,
        o.created_at,
        c.full_name AS customer_name,
        m.name AS merchant_name,
        du.full_name AS driver_name,
        od.id AS dispute_id,
        od.status AS dispute_status
     FROM orders o
     INNER JOIN app_users c ON c.id = o.customer_id
     INNER JOIN merchants m ON m.id = o.merchant_id
     LEFT JOIN driver_profiles dp ON dp.id = o.driver_id
     LEFT JOIN app_users du ON du.id = dp.user_id
     ${latestDisputeJoin}
     ${whereSql}
     ORDER BY o.created_at DESC
     LIMIT 50`,
    params,
  );

  const baseScope = buildWhereClause(session, "all", "all", "all");
  const totalOrders = (
    await db.get<{ count: number }>(
      `SELECT COUNT(*)::int as count
       FROM orders o
       INNER JOIN merchants m ON m.id = o.merchant_id
       LEFT JOIN driver_profiles dp ON dp.id = o.driver_id
       ${latestDisputeJoin}
       ${baseScope.whereSql}`,
      baseScope.params,
    )
  )?.count ?? 0;

  const openScope = buildWhereClause(session, "all", "all", "all");
  const openOrders = (
    await db.get<{ count: number }>(
      `SELECT COUNT(*)::int as count
       FROM orders o
       INNER JOIN merchants m ON m.id = o.merchant_id
       LEFT JOIN driver_profiles dp ON dp.id = o.driver_id
       ${latestDisputeJoin}
       ${openScope.whereSql ? `${openScope.whereSql} AND` : "WHERE"}
       o.status IN ('pending', 'confirmed', 'preparing', 'ready', 'picked_up')`,
      openScope.params,
    )
  )?.count ?? 0;

  const disputeScope = buildWhereClause(session, "all", "open", "all");
  const disputedOrders = (
    await db.get<{ count: number }>(
      `SELECT COUNT(*)::int as count
       FROM orders o
       INNER JOIN merchants m ON m.id = o.merchant_id
       LEFT JOIN driver_profiles dp ON dp.id = o.driver_id
       ${latestDisputeJoin}
       ${disputeScope.whereSql}`,
      disputeScope.params,
    )
  )?.count ?? 0;

  const unassignedScope = buildWhereClause(session, "all", "all", "unassigned");
  const unassignedOrders = (
    await db.get<{ count: number }>(
      `SELECT COUNT(*)::int as count
       FROM orders o
       INNER JOIN merchants m ON m.id = o.merchant_id
       LEFT JOIN driver_profiles dp ON dp.id = o.driver_id
       ${latestDisputeJoin}
       ${unassignedScope.whereSql}`,
      unassignedScope.params,
    )
  )?.count ?? 0;

  const readyScope = buildWhereClause(session, "ready", "all", "all");
  const readyForPickupOrders = (
    await db.get<{ count: number }>(
      `SELECT COUNT(*)::int as count
       FROM orders o
       INNER JOIN merchants m ON m.id = o.merchant_id
       LEFT JOIN driver_profiles dp ON dp.id = o.driver_id
       ${latestDisputeJoin}
       ${readyScope.whereSql}`,
      readyScope.params,
    )
  )?.count ?? 0;

  const availableDrivers =
    session.ownerAccess || session.role === "admin"
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
              COUNT(active_orders.id)::int AS active_order_count
           FROM driver_profiles dp
           INNER JOIN app_users du ON du.id = dp.user_id
           LEFT JOIN orders active_orders
             ON active_orders.driver_id = dp.id
            AND active_orders.status IN ('ready', 'picked_up')
           WHERE dp.is_verified = true
           GROUP BY dp.id, du.full_name, dp.availability, dp.vehicle_type
           ORDER BY
             CASE dp.availability
               WHEN 'available' THEN 1
               WHEN 'on_delivery' THEN 2
               ELSE 3
             END,
             active_order_count ASC,
             du.full_name ASC
           LIMIT 12`,
        )
      : [];

  const recommendedDriver = availableDrivers[0]
    ? { id: availableDrivers[0].id, name: availableDrivers[0].driver_name }
    : null;

  const mappedItems = items.map((item) => ({
    id: item.id,
    orderCode: item.order_code,
    status: item.status,
    paymentStatus: item.payment_status,
    driverId: item.driver_id,
    totalAmount: item.total_amount,
    currency: item.currency,
    createdAt: item.created_at,
    customerName: item.customer_name,
    merchantName: item.merchant_name,
    driverName: item.driver_name,
    disputeId: item.dispute_id,
    disputeStatus: item.dispute_status,
    dispatchPriority:
      item.status === "ready" && !item.driver_id
        ? ("dispatch_now" as const)
        : ["pending", "confirmed", "preparing"].includes(item.status) && !item.driver_id
          ? ("watch" as const)
          : ("normal" as const),
    recommendedDriverName: !item.driver_id ? recommendedDriver?.name ?? null : null,
    recommendedDriverId: !item.driver_id ? recommendedDriver?.id ?? null : null,
  }));

  if (session.ownerAccess || session.role === "admin") {
    const priorityWeight: Record<OrderListItem["dispatchPriority"], number> = {
      dispatch_now: 3,
      watch: 2,
      normal: 1,
    };

    mappedItems.sort((left, right) => {
      const weightDiff = priorityWeight[right.dispatchPriority] - priorityWeight[left.dispatchPriority];
      if (weightDiff !== 0) {
        return weightDiff;
      }
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }

  return {
    items: mappedItems,
    availableDrivers: availableDrivers.map((driver) => ({
      id: driver.id,
      name: driver.driver_name,
      availability: driver.availability,
      vehicleType: driver.vehicle_type,
      activeOrderCount: driver.active_order_count,
    })),
    filters: { status, dispute, assignment },
    totals: {
      totalOrders,
      openOrders,
      disputedOrders,
      unassignedOrders,
      readyForPickupOrders,
    },
  };
}
