import { randomUUID } from "node:crypto";
import { getDbExecutor } from "@/lib/db";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  readAt: string | null;
  link: string | null;
  createdAt: string;
}

export type NotificationType =
  | "order"
  | "payment"
  | "delivery"
  | "review"
  | "system"
  | "info";

interface NotificationRow {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: number | boolean;
  readAt: string | null;
  link: string | null;
  createdAt: string;
}

function mapNotification(row: NotificationRow): Notification {
  return {
    ...row,
    isRead: Boolean(row.isRead),
  };
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType = "info",
  link?: string,
): Promise<Notification> {
  const db = await getDbExecutor();
  const id = randomUUID();

  await db.run(
    `INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, datetime('now'))`,
    [id, userId, title, message, type, link ?? null],
  );

  const created = await db.get<NotificationRow>(
    `SELECT
       id,
       user_id as userId,
       title,
       message,
       type,
       is_read as isRead,
       read_at as readAt,
       link,
       created_at as createdAt
     FROM notifications
     WHERE id = ?`,
    [id],
  );

  if (!created) {
    throw new Error("Notification could not be created.");
  }

  return mapNotification(created);
}

export async function getNotificationsByUserId(userId: string, limit = 50): Promise<Notification[]> {
  const db = await getDbExecutor();
  const rows = await db.all<NotificationRow>(
    `SELECT
       id,
       user_id as userId,
       title,
       message,
       type,
       is_read as isRead,
       read_at as readAt,
       link,
       created_at as createdAt
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, limit],
  );

  return rows.map(mapNotification);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const db = await getDbExecutor();
  const result = await db.get<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM notifications
     WHERE user_id = ? AND is_read = 0`,
    [userId],
  );

  return result?.count ?? 0;
}

export async function markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
  const db = await getDbExecutor();
  await db.run(
    `UPDATE notifications
     SET is_read = 1, read_at = datetime('now')
     WHERE id = ? AND user_id = ?`,
    [notificationId, userId],
  );
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const db = await getDbExecutor();
  await db.run(
    `UPDATE notifications
     SET is_read = 1, read_at = datetime('now')
     WHERE user_id = ? AND is_read = 0`,
    [userId],
  );
}

export async function deleteNotification(notificationId: string, userId: string): Promise<void> {
  const db = await getDbExecutor();
  await db.run(
    `DELETE FROM notifications
     WHERE id = ? AND user_id = ?`,
    [notificationId, userId],
  );
}

export async function notifyOrderCreated(userId: string, orderCode: string, totalAmount: number) {
  return createNotification(
    userId,
    "Order created",
    `Your order ${orderCode} was created for ${(totalAmount / 100).toFixed(2)} SAR.`,
    "order",
    "/workspace/orders",
  );
}

export async function notifyOrderStatusChanged(
  userId: string,
  orderCode: string,
  status: string,
) {
  const statusMessages: Record<string, string> = {
    confirmed: "Order confirmed",
    preparing: "Order is being prepared",
    ready: "Order is ready",
    picked_up: "Order is on the way",
    delivered: "Order delivered",
    cancelled: "Order cancelled",
  };

  const label = statusMessages[status] ?? "Order updated";
  return createNotification(
    userId,
    label,
    `${orderCode}: ${label}.`,
    "order",
    "/workspace/orders",
  );
}

export async function notifyDriverAssigned(userId: string, orderCode: string, driverName: string) {
  return createNotification(
    userId,
    "Driver assigned",
    `${driverName} has been assigned to order ${orderCode}.`,
    "delivery",
    "/workspace/orders",
  );
}
