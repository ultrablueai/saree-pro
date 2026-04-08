import type { SessionUser } from "@/lib/auth";
import { getDbExecutor } from "@/lib/db";

export interface DisputeListItem {
  id: string;
  orderId: string;
  orderCode: string;
  status: string;
  reason: string;
  details: string | null;
  openedByRole: string;
  createdAt: string;
  resolvedAt: string | null;
  resolution: string | null;
  resolutionNote: string | null;
  customerName: string;
  merchantName: string;
  driverName: string | null;
  totalAmount: number;
  currency: string;
}

export async function getDisputeListForSession(
  session: SessionUser,
  filters: { status?: string; openedByRole?: string },
) {
  const db = await getDbExecutor();
  const whereParts: string[] = [];
  const params: Array<string> = [];

  const status = filters.status?.trim() || "all";
  const openedByRole = filters.openedByRole?.trim() || "all";

  if (status === "open" || status === "resolved") {
    whereParts.push("d.status = ?");
    params.push(status);
  }

  if (openedByRole !== "all") {
    whereParts.push("d.opened_by_role = ?");
    params.push(openedByRole);
  }

  if (!(session.ownerAccess || session.role === "admin")) {
    if (session.role === "customer") {
      whereParts.push("o.customer_id = ?");
      params.push(session.id);
    } else if (session.role === "merchant") {
      whereParts.push("m.owner_user_id = ?");
      params.push(session.id);
    } else if (session.role === "driver") {
      whereParts.push("dp.user_id = ?");
      params.push(session.id);
    }
  }

  const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

  const items = await db.all<{
    id: string;
    order_id: string;
    order_code: string;
    status: string;
    reason: string;
    details: string | null;
    opened_by_role: string;
    created_at: string;
    resolved_at: string | null;
    resolution: string | null;
    resolution_note: string | null;
    customer_name: string;
    merchant_name: string;
    driver_name: string | null;
    total_amount: number;
    currency: string;
  }>(
    `SELECT
        d.id,
        d.order_id,
        o.order_code,
        d.status,
        d.reason,
        d.details,
        d.opened_by_role,
        d.created_at,
        d.resolved_at,
        d.resolution,
        d.resolution_note,
        cu.full_name AS customer_name,
        m.name AS merchant_name,
        du.full_name AS driver_name,
        o.total_amount,
        o.currency
     FROM order_disputes d
     INNER JOIN orders o ON o.id = d.order_id
     INNER JOIN app_users cu ON cu.id = o.customer_id
     INNER JOIN merchants m ON m.id = o.merchant_id
     LEFT JOIN driver_profiles dp ON dp.id = o.driver_id
     LEFT JOIN app_users du ON du.id = dp.user_id
     ${whereSql}
     ORDER BY
       CASE d.status WHEN 'open' THEN 0 ELSE 1 END,
       datetime(d.created_at) DESC`,
    params,
  );

  const totals = {
    all: items.length,
    open: items.filter((item) => item.status === "open").length,
    resolved: items.filter((item) => item.status === "resolved").length,
  };

  return {
    filters: { status, openedByRole },
    totals,
    items: items.map((item) => ({
      id: item.id,
      orderId: item.order_id,
      orderCode: item.order_code,
      status: item.status,
      reason: item.reason,
      details: item.details,
      openedByRole: item.opened_by_role,
      createdAt: item.created_at,
      resolvedAt: item.resolved_at,
      resolution: item.resolution,
      resolutionNote: item.resolution_note,
      customerName: item.customer_name,
      merchantName: item.merchant_name,
      driverName: item.driver_name,
      totalAmount: item.total_amount,
      currency: item.currency,
    })),
  };
}
