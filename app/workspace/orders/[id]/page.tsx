import Link from 'next/link';
import { Button } from '@/components/Button';
import { requireSessionUser } from '@/lib/auth';
import { getDbExecutor } from '@/lib/db';

interface OrderDetailRow {
  id: string;
  order_code: string;
  status: string;
  currency: string;
  subtotal_amount: number;
  delivery_fee_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  special_instructions: string | null;
  created_at: string;
  confirmed_at: string | null;
  delivered_at: string | null;
  merchant_name: string;
  merchant_phone: string;
  street: string;
  building: string;
  floor: string | null;
  apartment: string | null;
  district: string | null;
  city: string;
  address_notes: string | null;
}

interface OrderItemRow {
  id: string;
  menu_item_name: string;
  quantity: number;
  total_price_amount: number;
  special_instructions: string | null;
}

interface PaymentTransactionRow {
  id: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
}

const statusConfig: Record<string, { colorClass: string; labelClass: string; label: string; icon: string; description: string }> = {
  pending: { colorClass: 'bg-amber-50 border-amber-200', labelClass: 'text-amber-700', label: 'Pending', icon: 'â³', description: 'Waiting for merchant confirmation' },
  confirmed: { colorClass: 'bg-blue-50 border-blue-200', labelClass: 'text-blue-700', label: 'Confirmed', icon: 'âœ…', description: 'Merchant has accepted your order' },
  preparing: { colorClass: 'bg-violet-50 border-violet-200', labelClass: 'text-violet-700', label: 'Preparing', icon: 'ðŸ‘¨â€ðŸ³', description: 'Your food is being prepared' },
  ready: { colorClass: 'bg-green-50 border-green-200', labelClass: 'text-green-700', label: 'Ready', icon: 'ðŸ“¦', description: 'Ready for driver pickup' },
  picked_up: { colorClass: 'bg-indigo-50 border-indigo-200', labelClass: 'text-indigo-700', label: 'On the Way', icon: 'ðŸš—', description: 'Driver is on the way to you' },
  delivered: { colorClass: 'bg-slate-100 border-slate-200', labelClass: 'text-slate-700', label: 'Delivered', icon: 'âœ“', description: 'Order delivered successfully' },
  cancelled: { colorClass: 'bg-rose-50 border-rose-200', labelClass: 'text-rose-700', label: 'Cancelled', icon: 'âœ•', description: 'Order was cancelled' },
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSessionUser();
  const db = await getDbExecutor();
  const { id: orderId } = await params;

  const order = (await db.get(
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
  )) as OrderDetailRow | undefined;

  if (!order) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6 text-center">
          <h2 className="text-xl font-semibold text-yellow-900">Order Not Found</h2>
          <p className="mt-2 text-sm text-yellow-700">
            This order doesn&apos;t exist or you don&apos;t have permission to view it.
          </p>
          <Link
            href="/workspace/orders"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-[var(--color-surface-strong)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] shadow-[0_16px_38px_-28px_rgba(35,24,19,0.35)] transition hover:bg-[var(--color-surface-alt)]"
          >
            Back to Orders
          </Link>
        </div>
      </main>
    );
  }

  const items = (await db.all(`SELECT * FROM order_items WHERE order_id = ?`, [orderId])) as OrderItemRow[];
  const transactions = (await db.all(
    `SELECT * FROM payment_transactions WHERE order_id = ? ORDER BY created_at DESC`,
    [orderId]
  )) as PaymentTransactionRow[];

  const status = statusConfig[order.status] || statusConfig.pending;

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-8">
        <Link href="/workspace/orders" className="text-sm text-[var(--color-accent-strong)] hover:underline">
          â† Back to Orders
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <h1 className="text-3xl font-semibold text-[var(--color-ink)]">Order #{order.order_code}</h1>
          <span
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${status.colorClass} ${status.labelClass}`}
          >
            {status.icon} {status.label}
          </span>
        </div>
        <p className="mt-2 text-[var(--color-muted)]">{status.description}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-xl border border-[var(--color-border)] bg-white p-6">
            <h2 className="text-xl font-semibold text-[var(--color-ink)]">Order Items</h2>
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between border-b border-[var(--color-border)] pb-3 last:border-0"
                >
                  <div>
                    <h3 className="font-semibold text-[var(--color-ink)]">{item.menu_item_name}</h3>
                    <p className="text-sm text-[var(--color-muted)]">Quantity: {item.quantity}</p>
                    {item.special_instructions && (
                      <p className="mt-1 text-xs text-orange-600">Note: {item.special_instructions}</p>
                    )}
                  </div>
                  <p className="font-semibold text-[var(--color-accent-strong)]">
                    {(item.total_price_amount / 100).toFixed(2)} {order.currency}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-white p-6">
            <h2 className="text-xl font-semibold text-[var(--color-ink)]">Delivery Address</h2>
            <div className="mt-4">
              <p className="text-[var(--color-ink)]">
                {order.street}, {order.building}
                {order.floor ? `, Floor ${order.floor}` : ''}
                {order.apartment ? `, Apt ${order.apartment}` : ''}
              </p>
              <p className="mt-1 text-[var(--color-ink)]">
                {order.district && `${order.district}, `}
                {order.city}
              </p>
              {order.address_notes && (
                <p className="mt-2 text-sm text-[var(--color-muted)]">{order.address_notes}</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-white p-6">
            <h2 className="text-xl font-semibold text-[var(--color-ink)]">Merchant</h2>
            <div className="mt-4">
              <p className="font-semibold text-[var(--color-ink)]">{order.merchant_name}</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{order.merchant_phone}</p>
            </div>
          </div>

          {order.special_instructions && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
              <h2 className="text-lg font-semibold text-orange-900">Special Instructions</h2>
              <p className="mt-2 text-sm text-orange-700">{order.special_instructions}</p>
            </div>
          )}
        </div>

        <div className="lg:col-start-2">
          <div className="sticky top-8 space-y-6">
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
                    {order.payment_method === 'cash' ? 'ðŸ’µ Cash' : 'ðŸ’³ Card'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">Status</span>
                  <span className="font-semibold text-[var(--color-ink)]">
                    {order.payment_status === 'paid' ? 'âœ“ Paid' : 'â—‹ Unpaid'}
                  </span>
                </div>
              </div>

              {transactions.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <h3 className="text-sm font-semibold text-[var(--color-ink)]">Transactions</h3>
                  <div className="mt-3 space-y-2 text-sm">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="flex justify-between text-[var(--color-muted)]">
                        <span>{transaction.provider} ({transaction.status})</span>
                        <span>{(transaction.amount / 100).toFixed(2)} {transaction.currency}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-white p-6">
              <h2 className="text-xl font-semibold text-[var(--color-ink)]">Timeline</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-[var(--color-ink)]">Order Placed</p>
                  <p className="text-[var(--color-muted)]">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                {order.confirmed_at && (
                  <div>
                    <p className="font-semibold text-[var(--color-ink)]">Confirmed</p>
                    <p className="text-[var(--color-muted)]">{new Date(order.confirmed_at).toLocaleString()}</p>
                  </div>
                )}
                {order.delivered_at && (
                  <div>
                    <p className="font-semibold text-[var(--color-ink)]">Delivered</p>
                    <p className="text-[var(--color-muted)]">{new Date(order.delivered_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

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
