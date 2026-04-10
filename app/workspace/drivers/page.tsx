import Link from 'next/link';
import { Button } from '@/components/Button';
import { requireRole } from '@/lib/auth';
import { getDbExecutor } from '@/lib/db';

interface DriverProfileRow {
  id: string;
  availability: string;
}

interface DriverOrderRow {
  id: string;
  order_code: string;
  merchant_name: string;
  street: string;
  district: string | null;
  city: string;
  total_amount: number;
  currency: string;
}

interface DriverStatsRow {
  total_deliveries: number;
  completed_deliveries: number;
}

export default async function DriverDashboardPage() {
  const session = await requireRole(['driver', 'admin', 'owner']);
  const db = await getDbExecutor();

  const driver = (await db.get(`SELECT * FROM driver_profiles WHERE user_id = ?`, [session.id])) as
    | DriverProfileRow
    | undefined;

  if (!driver) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6 text-center">
          <h2 className="text-xl font-semibold text-yellow-900">No Driver Profile</h2>
          <p className="mt-2 text-sm text-yellow-700">
            You need to complete your driver profile first.
          </p>
          <Link
            href="/workspace/drivers/setup"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-accent),var(--color-accent-strong))] px-5 py-3 text-sm font-semibold text-white shadow-[0_22px_45px_-24px_rgba(214,107,66,0.78)] transition hover:brightness-105"
          >
            Setup Profile
          </Link>
        </div>
      </main>
    );
  }

  const availableOrders =
    driver.availability === 'online'
      ? ((await db.all(
          `
        SELECT
          o.*,
          m.name as merchant_name,
          m.slug as merchant_slug,
          a.street,
          a.district,
          a.city
        FROM orders o
        JOIN merchants m ON o.merchant_id = m.id
        JOIN addresses a ON o.delivery_address_id = a.id
        WHERE o.status = 'ready'
        AND o.driver_id IS NULL
        ORDER BY o.created_at DESC
        LIMIT 20
      `
        )) as DriverOrderRow[])
      : [];

  const currentDeliveries = (await db.all(
    `
    SELECT
      o.*,
      m.name as merchant_name,
      a.street,
      a.district,
      a.city
    FROM orders o
    JOIN merchants m ON o.merchant_id = m.id
    JOIN addresses a ON o.delivery_address_id = a.id
    WHERE o.driver_id = ?
    AND o.status IN ('picked_up', 'confirmed')
    ORDER BY o.created_at DESC
  `,
    [driver.id]
  )) as DriverOrderRow[];

  const stats = (await db.get(
    `
    SELECT
      COUNT(*) as total_deliveries,
      SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as completed_deliveries
    FROM orders
    WHERE driver_id = ?
  `,
    [driver.id]
  )) as DriverStatsRow | undefined;

  const isOnline = driver.availability === 'online';

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-ink)]">Driver Dashboard</h1>
          <p className="mt-2 text-[var(--color-muted)]">
            Manage your deliveries and track earnings
          </p>
        </div>
        <form action="/workspace/drivers/toggle-status" method="POST">
          <Button type="submit" variant={isOnline ? 'secondary' : 'primary'}>
            {isOnline ? 'ðŸŸ¢ Go Offline' : 'âš« Go Online'}
          </Button>
        </form>
      </div>

      <div
        className={`mb-8 rounded-xl border p-6 ${
          isOnline ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-ink)]">
              {isOnline ? 'You are Online' : 'You are Offline'}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {isOnline
                ? 'You will receive delivery requests'
                : 'Go online to start receiving deliveries'}
            </p>
          </div>
          <div className="text-5xl">{isOnline ? 'ðŸŸ¢' : 'âš«'}</div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-6">
          <p className="text-sm text-[var(--color-muted)]">Total Deliveries</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--color-ink)]">
            {stats?.total_deliveries || 0}
          </p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-6">
          <p className="text-sm text-green-700">Completed</p>
          <p className="mt-2 text-3xl font-semibold text-green-900">
            {stats?.completed_deliveries || 0}
          </p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
          <p className="text-sm text-blue-700">In Progress</p>
          <p className="mt-2 text-3xl font-semibold text-blue-900">{currentDeliveries.length}</p>
        </div>
      </div>

      {currentDeliveries.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold text-[var(--color-ink)]">
            Current Deliveries
          </h2>
          <div className="space-y-4">
            {currentDeliveries.map((order) => (
              <div key={order.id} className="rounded-xl border border-blue-200 bg-white p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[var(--color-ink)]">
                      Order #{order.order_code}
                    </h3>
                    <p className="mt-2 text-sm text-[var(--color-muted)]">From: {order.merchant_name}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      To: {order.street}, {order.district}, {order.city}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
                      {(order.total_amount / 100).toFixed(2)} {order.currency}
                    </p>
                  </div>
                  <Link
                    href={`/workspace/orders/${order.id}`}
                    className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-accent),var(--color-accent-strong))] px-5 py-3 text-sm font-semibold text-white shadow-[0_22px_45px_-24px_rgba(214,107,66,0.78)] transition hover:brightness-105"
                  >
                    View Order
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isOnline && (
        <div>
          <h2 className="mb-4 text-2xl font-semibold text-[var(--color-ink)]">
            Available Deliveries
          </h2>
          {availableOrders.length > 0 ? (
            <div className="space-y-4">
              {availableOrders.map((order) => (
                <div key={order.id} className="rounded-xl border border-green-200 bg-white p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[var(--color-ink)]">
                        Order #{order.order_code}
                      </h3>
                      <p className="mt-2 text-sm text-[var(--color-muted)]">From: {order.merchant_name}</p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        To: {order.street}, {order.district}, {order.city}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
                        {(order.total_amount / 100).toFixed(2)} {order.currency}
                      </p>
                    </div>
                    <form action="/workspace/drivers/accept-order" method="POST">
                      <input type="hidden" name="orderId" value={order.id} />
                      <Button type="submit">Accept</Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--color-border)] bg-white p-12 text-center">
              <p className="text-lg text-[var(--color-muted)]">No available deliveries right now</p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                New orders will appear here when you&apos;re online
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
