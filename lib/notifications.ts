import { getDbExecutor } from '@/lib/db';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  readAt: Date | null;
  link: string | null;
  createdAt: Date;
}

export type NotificationType = 'order' | 'payment' | 'delivery' | 'review' | 'system' | 'info';

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType = 'info',
  link?: string
): Promise<Notification> {
  const db = await getDbExecutor();
  
  const result = await db.run(
    `INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at)
     VALUES (?, ?, ?, ?, 0, ?, datetime('now'))`,
    [userId, title, message, type, link || null]
  );

  return {
    id: (result as any).id,
    userId,
    title,
    message,
    type,
    isRead: false,
    readAt: null,
    link: link || null,
    createdAt: new Date(),
  };
}

export async function getNotificationsByUserId(userId: string): Promise<Notification[]> {
  const db = await getDbExecutor();
  return db.all<Notification[]>(
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
    LIMIT 50`,
    [userId]
  );
}

export async function getUnreadCount(userId: string): Promise<number> {
  const db = await getDbExecutor();
  const result = await db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
    [userId]
  );
  return result?.count || 0;
}

export async function markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
  const db = await getDbExecutor();
  await db.run(
    `UPDATE notifications SET is_read = 1, read_at = datetime('now') 
     WHERE id = ? AND user_id = ?`,
    [notificationId, userId]
  );
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const db = await getDbExecutor();
  await db.run(
    `UPDATE notifications SET is_read = 1, read_at = datetime('now') 
     WHERE user_id = ? AND is_read = 0`,
    [userId]
  );
}

export async function deleteNotification(notificationId: string, userId: string): Promise<void> {
  const db = await getDbExecutor();
  await db.run(
    `DELETE FROM notifications WHERE id = ? AND user_id = ?`,
    [notificationId, userId]
  );
}

// إنشاء إشعارات تلقائية بناءً على الأحداث
export async function notifyOrderCreated(userId: string, orderCode: string, totalAmount: number) {
  return createNotification(
    userId,
    'تم إنشاء الطلب بنجاح',
    `تم إنشاء طلبك ${orderCode} بمبلغ ${(totalAmount / 100).toFixed(2)} ريال`,
    'order',
    `/workspace/orders`
  );
}

export async function notifyOrderStatusChanged(
  userId: string,
  orderCode: string,
  status: string
) {
  const statusMessages: Record<string, string> = {
    confirmed: 'تم تأكيد طلبك',
    preparing: 'جاري تحضير طلبك',
    ready: 'طلبك جاهز للاستلام',
    picked_up: 'طلبك في الطريق',
    delivered: 'تم تسليم طلبك',
    cancelled: 'تم إلغاء طلبك',
  };

  return createNotification(
    userId,
    statusMessages[status] || 'تحديث حالة الطلب',
    `تم تحديث حالة طلبك ${orderCode}: ${statusMessages[status] || status}`,
    'order',
    `/workspace/orders`
  );
}

export async function notifyDriverAssigned(
  userId: string,
  orderCode: string,
  driverName: string
) {
  return createNotification(
    userId,
    'تم تعيين سائق لطلبك',
    `السائق ${driverName} في الطريق لتوصيل طلبك ${orderCode}`,
    'delivery',
    `/workspace/orders`
  );
}
