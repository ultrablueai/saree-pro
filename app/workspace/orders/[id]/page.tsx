import { requireSessionUser } from '@/lib/auth';
import { getDbExecutor } from '@/lib/db';
import { Button } from '@/components/Button';
import Link from 'next/link';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSessionUser();
  const db = await getDbExecutor();
  const { id: orderId } = await params;

  // Get order
  const order = await db.get(
    `SELECT 
      o.*,
      m.name as merchant_name,
      m.slug as merchant_slug,
      m.phone as merchant_phone,
      a.street,
      a.building,
      a.floor,
      a.apartment,
      a.district,
      a.city,
      a.notes as address_notes
     FROM orders o
     JOIN merchants m ON o.merchant_id = m.id
     JOIN addresses a ON o.delivery_address_id = a.id
     WHERE o.id = ? AND o.customer_id = ?`,
    [orderId, session.id]
  ) as any;

  if (!order) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6 text-center">
          <h2 className="text-xl font-semibold text-yellow-900">Order Not Found</h2>
          <p className="mt-2 text-sm text-yellow-700">
            This order doesn&apos;t exist or you don&apos;t have permission to view it.
          </p>
          <Link href="/workspace/orders" className="mt-4 inline-block">
            <Button variant="secondary">Back to Orders</Button>
          </Link>
        </div>
      </main>
    );
  }

  // Get order items
  const items = await db.all(
    `SELECT * FROM order_items WHERE order_id = ?`,
    [orderId]
  ) as any[];

  // Get payment transactions
  const transactions = await db.all(
    `SELECT * FROM payment_transactions WHERE order_id = ? ORDER BY created_at DESC`,
    [orderId]
  ) as any[];

  const statusConfig: Record<string, { color: string; label: string; icon: string; description: string }> = {
    pending: { color: 'yellow', label: 'Pending', icon: '⏳', description: 'Waiting for merchant confirmation' },
    confirmed: { color: 'blue', label: 'Confirmed', icon: '✅', description: 'Merchant has accepted your order' },
    preparing: { color: 'purple', label: 'Preparing', icon: '👨‍🍳', description: 'Your food is being prepared' },
    ready: { color: 'green', label: 'Ready', icon: '📦', description: 'Ready for driver pickup' },
    picked_up: { color: 'indigo', label: 'On the Way', icon: '🚗', description: 'Driver is on the way to you' },
    delivered: { color: 'gray', label: 'Delivered', icon: '✓', description: 'Order delivered successfully' },
    cancelled: { color: 'red', label: 'Cancelled', icon: '✕', description: 'Order was cancelled' },
  };

  const status = statusConfig[order.status] || statusConfig.pending;

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/workspace/orders" className="text-sm text-[var(--color-accent-strong)] hover:underline">
          ← Back to Orders
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <h1 className="text-3xl font-semibold text-[var(--color-ink)]">
            Order #{order.order_code}
          </h1>
          <span
            className={`rounded-full border bg-${status.color}-50 px-4 py-2 text-sm font-semibold text-${status.color}-700 border-${status.color}-200`}
          >
            {status.icon} {status.label}
          </span>
        </div>
        <p className="mt-2 text-[var(--color-muted)]">{status.description}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Order Details */}
        <div className="space-y-6">
          {/* Items */}
          <div className="rounded-xl border border-[var(--color-border)] bg-white p-6">
            <h2 className="text-xl font-semibold text-[var(--color-ink)]">Order Items</h2>
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-start justify-between border-b border-[var(--color-border)] pb-3 last:border-0">
                  <div>
                    <h3 className="font-semibold text-[var(--color-ink)]">{item.menu_item_name}</h3>
                    <p className="text-sm text-[var(--color-muted)]">Quantity: {item.quantity}</p>
                    {item.special_instructions && (
                      <p className="mt-1 text-xs text-orange-600">
                        Note: {item.special_instructions}
                      </p>
                    )}
                  </div>
                  <p className="font-semibold text-[var(--color-accent-strong)]">
                    {((item.total_price_amount) / 100).toFixed(2)} {order.currency}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Address */}
          <div className="rounded-xl border border-[var(--color-border)] bg-white p-6">
            <h2 className="text-xl font-semibold text-[var(--color-ink)]">Delivery Address</h2>
            <div className="mt-4">
              <p className="text-[var(--color-ink)]">
                {order.street}, {order.building}
                {order.floor && `, Floor ${order.floor}`}
                {order.apartment && `, Apt ${order.apartment}`}
              </p>
              <p className="mt-1 text-[var(--color-ink)]">
                {order.district && `${order.district}, `}{order.city}
              </p>
              {order.address_notes && (
                <p className="mt-2 text-sm text-[var(--color-muted)]">{order.address_notes}</p>
              )}
            </div>
          </div>

          {/* Merchant Info */}
          <div className="rounded-xl border border-[var(--color-border)] bg-white p-6">
            <h2 className="text-xl font-semibold text-[var(--color-ink)]">Merchant</h2>
            <div className="mt-4">
              <p className="font-semibold text-[var(--color-ink)]">{order.merchant_name}</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{order.merchant_phone}</p>
            </div>
          </div>

          {/* Special Instructions */}
          {order.special_instructions && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
              <h2 className="text-lg font-semibold text-orange-900">Special Instructions</h2>
              <p className="mt-2 text-sm text-orange-700">{order.special_instructions}</p>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="lg:col-start-2">
          <div className="sticky top-8 space-y-6">
            {/* Payment Summary */}
            <div className="rounded-xl border border-[var(--color-border)] bg-white p-6">
              <h2 className="text-xl font-semibold text-[var(--color-ink)]">Payment Summary</h2>
              
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between text-[var(--color-muted)]">
                  <span>Subtotal</span>
                  <span>{(order.subtotal_amount / 100).toFixed(2)} {order.currency}</span>
                </div>
                <div className="flex justify-between text-[var(--color-muted)]">
                  <span>Delivery Fee</span>
                  <span>{(order.delivery_fee_amount / 100).toFixed(2)} {order.currency}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{(order.discount_amount / 100).toFixed(2)} {order.currency}</span>
                  </div>
                )}
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-semibold text-[var(--color-ink)]">
                    <span>Total</span>
                    <span>{(order.total_amount / 100).toFixed(2)} {order.currency}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">Payment Method</span>
                  <span className="font-semibold text-[var(--color-ink)]">
                    {order.payment_method === 'cash' ? '💵 Cash' : '💳 Card'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">Status</span>
                  <span className="font-semibold text-[var(--color-ink)]">
                    {order.payment_status === 'paid' ? '✓ Paid' : '○ Unpaid'}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="rounded-xl border border-[var(--color-border)] bg-white p-6">
              <h2 className="text-xl font-semibold text-[var(--color-ink)]">Timeline</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-[var(--color-ink)]">Order Placed</p>
                  <p className="text-[var(--color-muted)]">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                {order.confirmed_at && (
                  <div>
                    <p className="font-semibold text-[var(--color-ink)]">Confirmed</p>
                    <p className="text-[var(--color-muted)]">
                      {new Date(order.confirmed_at).toLocaleString()}
                    </p>
                  </div>
                )}
                {order.delivered_at && (
                  <div>
                    <p className="font-semibold text-[var(--color-ink)]">Delivered</p>
                    <p className="text-[var(--color-muted)]">
                      {new Date(order.delivered_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {order.status === 'pending' && (
              <div className="rounded-xl border border-[var(--color-border)] bg-white p-6">
                <Button variant="secondary" className="w-full">
                  Cancel Order
                </Button>
              </div>
            )}

            {order.status === 'delivered' && (
              <div className="rounded-xl border border-[var(--color-border)] bg-white p-6">
                <Link href={`/workspace/orders/${order.id}/review`} className="block">
                  <Button className="w-full">Write a Review</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
