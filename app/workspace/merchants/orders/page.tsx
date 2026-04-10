import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { getDbExecutor } from '@/lib/db';

interface MerchantRow {
  id: string;
}

interface MerchantOrderRow {
  id: string;
  order_code: string;
  status: string;
  customer_name: string;
  customer_email: string;
  item_count: number;
  total_amount: number;
  currency: string;
  created_at: string;
  special_instructions: string | null;
}

export default async function MerchantOrdersPage() {
  const session = await requireRole(['merchant', 'admin', 'owner']);
  const db = await getDbExecutor();

  const merchant = (await db.get(`SELECT id FROM merchants WHERE owner_user_id = ?`, [session.id])) as
    | MerchantRow
    | undefined;

  if (!merchant) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6 text-center">
          <h2 className="text-xl font-semibold text-yellow-900">No Merchant Profile</h2>
          <p className="mt-2 text-sm text-yellow-700">
            You need to set up your merchant profile first.
          </p>
        </div>
      </main>
    );
  }

  const orders = (await db.all(
    `
    SELECT
      o.*,
      u.full_name as customer_name,
      u.email as customer_email,
      COUNT(oi.id) as item_count
    FROM orders o
    JOIN app_users u ON o.customer_id = u.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.merchant_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
    LIMIT 50
  `,
    [merchant.id]
  )) as MerchantOrderRow[];

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
    preparing: 'bg-purple-50 text-purple-700 border-purple-200',
    ready: 'bg-green-50 text-green-700 border-green-200',
    picked_up: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    delivered: 'bg-gray-50 text-gray-700 border-gray-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-ink)]">Orders</h1>
          <p className="mt-2 text-[var(--color-muted)]">
            Manage incoming orders and update their status
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {orders.length > 0 ? (
          orders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-[var(--color-border)] bg-white p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-[var(--color-ink)]">
                      Order #{order.order_code}
                    </h3>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        statusColors[order.status] || 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    Customer: {order.customer_name} ({order.customer_email})
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    Items: {order.item_count} | Total: {(order.total_amount / 100).toFixed(2)} {order.currency}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    Placed at: {new Date(order.created_at).toLocaleString()}
                  </p>
                  {order.special_instructions && (
                    <p className="mt-2 text-sm text-orange-600">Special: {order.special_instructions}</p>
                  )}
                </div>
                <Link
                  href={`/workspace/orders/${order.id}`}
                  className="inline-flex items-center justify-center rounded-full bg-[var(--color-surface-strong)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] shadow-[0_16px_38px_-28px_rgba(35,24,19,0.35)] transition hover:bg-[var(--color-surface-alt)]"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-[var(--color-border)] bg-white p-12 text-center">
            <p className="text-lg text-[var(--color-muted)]">No orders yet</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">New orders will appear here</p>
          </div>
        )}
      </div>
    </main>
  );
}
