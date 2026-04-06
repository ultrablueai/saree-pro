import { getDbExecutor } from "@/lib/db";

async function count(table: string) {
  const db = await getDbExecutor();
  const row = await db.get<{ count: number }>(
    `SELECT COUNT(*)::int as count FROM ${table}`,
  );
  return row?.count ?? 0;
}

export async function getDashboardMetrics() {
  const db = await getDbExecutor();
  const openOrdersRow = await db.get<{ count: number }>(
    `SELECT COUNT(*)::int as count
     FROM orders
     WHERE status IN ('pending', 'confirmed', 'preparing', 'ready', 'picked_up')`,
  );

  const availableMenuItemsRow = await db.get<{ count: number }>(
    `SELECT COUNT(*)::int as count
     FROM menu_items
     WHERE is_available = ?`,
    [true],
  );

  return {
    users: await count("app_users"),
    merchants: await count("merchants"),
    drivers: await count("driver_profiles"),
    orders: await count("orders"),
    openOrders: openOrdersRow?.count ?? 0,
    availableMenuItems: availableMenuItemsRow?.count ?? 0,
  };
}
