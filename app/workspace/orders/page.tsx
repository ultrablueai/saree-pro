import Link from 'next/link';
import { requireSessionUser } from '@/lib/auth';
import { getDbExecutor } from '@/lib/db';

interface OrdersPageRow {
  id: string;
  order_code: string;
  status: string;
  merchant_name: string;
  item_count: number;
  total_amount: number;
  currency: string;
  created_at: string;
}

const statusConfig: Record<string, { colorClass: string; labelClass: string; label: string; icon: string }> = {
  pending: { colorClass: 'bg-amber-50 border-amber-200', labelClass: 'text-amber-700', label: 'Pending', icon: 'â³' },
  confirmed: { colorClass: 'bg-blue-50 border-blue-200', labelClass: 'text-blue-700', label: 'Confirmed', icon: 'âœ…' },
  preparing: { colorClass: 'bg-violet-50 border-violet-200', labelClass: 'text-violet-700', label: 'Preparing', icon: 'ðŸ‘¨â€ðŸ³' },
  ready: { colorClass: 'bg-green-50 border-green-200', labelClass: 'text-green-700', label: 'Ready for Pickup', icon: 'ðŸ“¦' },
  picked_up: { colorClass: 'bg-indigo-50 border-indigo-200', labelClass: 'text-indigo-700', label: 'On the Way', icon: 'ðŸš—' },
  delivered: { colorClass: 'bg-slate-100 border-slate-200', labelClass: 'text-slate-700', label: 'Delivered', icon: 'âœ“' },
  cancelled: { colorClass: 'bg-rose-50 border-rose-200', labelClass: 'text-rose-700', label: 'Cancelled', icon: 'âœ•' },
};

export default async function OrdersPage() {
  const session = await requireSessionUser();
  const db = await getDbExecutor();

  const orders = (await db.all(
    `SELECT
      o.*,
      m.name as merchant_name,
      m.slug as merchant_slug,
      COUNT(oi.id) as item_count
     FROM orders o
     JOIN merchants m ON o.merchant_id = m.id
     LEFT JOIN order_items oi ON o.id = oi.order_id
     WHERE o.customer_id = ?
     GROUP BY o.id
     ORDER BY o.created_at DESC
     LIMIT 50`,
    [session.id]
  )) as OrdersPageRow[];

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-[var(--color-ink)]">My Orders</h1>
        <p className="mt-2 text-[var(--color-muted)]">Track your orders and view history</p>
      </div>

      <div className="space-y-4">
        {orders.length > 0 ? (
          orders.map((order) => {
            const status = statusConfig[order.status] || statusConfig.pending;

            return (
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
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${status.colorClass} ${status.labelClass}`}
                      >
                        {status.icon} {status.label}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-[var(--color-muted)]">From: {order.merchant_name}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      Items: {order.item_count} | Total: {(order.total_amount / 100).toFixed(2)} {order.currency}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      Placed: {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>

                  <Link
                    href={`/workspace/orders/${order.id}`}
                    className="inline-flex items-center justify-center rounded-full bg-[var(--color-surface-strong)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] shadow-[0_16px_38px_-28px_rgba(35,24,19,0.35)] transition hover:bg-[var(--color-surface-alt)]"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-[var(--color-border)] bg-white p-16 text-center">
            <div className="text-6xl">ðŸ“¦</div>
            <h2 className="mt-6 text-2xl font-semibold text-[var(--color-ink)]">No orders yet</h2>
            <p className="mt-3 text-[var(--color-muted)]">
              Start ordering from your favorite merchants
            </p>
            <Link
              href="/workspace/merchants"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-accent),var(--color-accent-strong))] px-5 py-3 text-sm font-semibold text-white shadow-[0_22px_45px_-24px_rgba(214,107,66,0.78)] transition hover:brightness-105"
            >
              Browse Merchants
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
