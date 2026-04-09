import { requireSessionUser } from '@/lib/auth';
import { getDbExecutor } from '@/lib/db';
import { Button } from '@/components/Button';
import Link from 'next/link';

export default async function OrdersPage() {
  const session = await requireSessionUser();
  const db = await getDbExecutor();

  // Get orders
  const orders = await db.all(
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
  ) as any[];

  const statusConfig: Record<string, { color: string; label: string; icon: string }> = {
    pending: { color: 'yellow', label: 'Pending', icon: '⏳' },
    confirmed: { color: 'blue', label: 'Confirmed', icon: '✅' },
    preparing: { color: 'purple', label: 'Preparing', icon: '👨‍🍳' },
    ready: { color: 'green', label: 'Ready for Pickup', icon: '📦' },
    picked_up: { color: 'indigo', label: 'On the Way', icon: '🚗' },
    delivered: { color: 'gray', label: 'Delivered', icon: '✓' },
    cancelled: { color: 'red', label: 'Cancelled', icon: '✕' },
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-[var(--color-ink)]">My Orders</h1>
        <p className="mt-2 text-[var(--color-muted)]">
          Track your orders and view history
        </p>
      </div>

      <div className="space-y-4">
        {orders && orders.length > 0 ? (
          orders.map((order) => {
            const status = statusConfig[order.status] || statusConfig.pending;
            const statusColor = status.color;
            
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
                        className={`rounded-full border bg-${statusColor}-50 px-3 py-1 text-xs font-semibold text-${statusColor}-700 border-${statusColor}-200`}
                      >
                        {status.icon} {status.label}
                      </span>
                    </div>
                    
                    <p className="mt-2 text-sm text-[var(--color-muted)]">
                      From: {order.merchant_name}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      Items: {order.item_count} | Total: {(order.total_amount / 100).toFixed(2)} {order.currency}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      Placed: {new Date(order.created_at).toLocaleString()}
                    </p>

                    {/* Progress Tracker */}
                    {order.status !== 'cancelled' && (
                      <div className="mt-4">
                        <div className="flex items-center gap-2 text-xs">
                          <div className={`h-2 w-2 rounded-full ${
                            ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered'].includes(order.status)
                              ? 'bg-green-500'
                              : 'bg-gray-300'
                          }`} />
                          <span className={
                            ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered'].includes(order.status)
                              ? 'text-green-700 font-semibold'
                              : 'text-gray-500'
                          }>
                            Placed
                          </span>
                          
                          <div className="flex-1 h-px bg-gray-300" />
                          
                          <div className={`h-2 w-2 rounded-full ${
                            ['confirmed', 'preparing', 'ready', 'picked_up', 'delivered'].includes(order.status)
                              ? 'bg-green-500'
                              : 'bg-gray-300'
                          }`} />
                          <span className={
                            ['confirmed', 'preparing', 'ready', 'picked_up', 'delivered'].includes(order.status)
                              ? 'text-green-700 font-semibold'
                              : 'text-gray-500'
                          }>
                            Confirmed
                          </span>
                          
                          <div className="flex-1 h-px bg-gray-300" />
                          
                          <div className={`h-2 w-2 rounded-full ${
                            ['preparing', 'ready', 'picked_up', 'delivered'].includes(order.status)
                              ? 'bg-green-500'
                              : 'bg-gray-300'
                          }`} />
                          <span className={
                            ['preparing', 'ready', 'picked_up', 'delivered'].includes(order.status)
                              ? 'text-green-700 font-semibold'
                              : 'text-gray-500'
                          }>
                            Preparing
                          </span>
                          
                          <div className="flex-1 h-px bg-gray-300" />
                          
                          <div className={`h-2 w-2 rounded-full ${
                            ['ready', 'picked_up', 'delivered'].includes(order.status)
                              ? 'bg-green-500'
                              : 'bg-gray-300'
                          }`} />
                          <span className={
                            ['ready', 'picked_up', 'delivered'].includes(order.status)
                              ? 'text-green-700 font-semibold'
                              : 'text-gray-500'
                          }>
                            Ready
                          </span>
                          
                          <div className="flex-1 h-px bg-gray-300" />
                          
                          <div className={`h-2 w-2 rounded-full ${
                            ['picked_up', 'delivered'].includes(order.status)
                              ? 'bg-green-500'
                              : 'bg-gray-300'
                          }`} />
                          <span className={
                            ['picked_up', 'delivered'].includes(order.status)
                              ? 'text-green-700 font-semibold'
                              : 'text-gray-500'
                          }>
                            On the Way
                          </span>
                          
                          <div className="flex-1 h-px bg-gray-300" />
                          
                          <div className={`h-2 w-2 rounded-full ${
                            order.status === 'delivered'
                              ? 'bg-green-500'
                              : 'bg-gray-300'
                          }`} />
                          <span className={
                            order.status === 'delivered'
                              ? 'text-green-700 font-semibold'
                              : 'text-gray-500'
                          }>
                            Delivered
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/workspace/orders/${order.id}`}>
                      <Button variant="secondary" className="text-sm">View Details</Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-[var(--color-border)] bg-white p-16 text-center">
            <div className="text-6xl">📦</div>
            <h2 className="mt-6 text-2xl font-semibold text-[var(--color-ink)]">
              No orders yet
            </h2>
            <p className="mt-3 text-[var(--color-muted)]">
              Start ordering from your favorite merchants
            </p>
            <Link href="/workspace/merchants" className="mt-6 inline-block">
              <Button>Browse Merchants</Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
