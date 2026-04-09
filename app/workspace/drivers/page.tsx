import { requireRole } from '@/lib/auth';
import { getDbExecutor } from '@/lib/db';
import { Button } from '@/components/Button';

export default async function DriverDashboardPage() {
  const session = await requireRole(['driver', 'admin', 'owner']);

  const db = await getDbExecutor();

  // Get driver profile
  const driver = await db.get(`
    SELECT * FROM driver_profiles WHERE user_id = ?
  `, [session.id]);

  if (!driver) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6 text-center">
          <h2 className="text-xl font-semibold text-yellow-900">No Driver Profile</h2>
          <p className="mt-2 text-sm text-yellow-700">
            You need to complete your driver profile first.
          </p>
          <a href="/workspace/drivers/setup" className="mt-4 inline-block">
            <Button>Setup Profile</Button>
          </a>
        </div>
      </main>
    );
  }

  // Get available orders (if driver is online)
  const availableOrders = driver.availability === 'online'
    ? await db.all(`
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
      `)
    : [];

  // Get driver's current deliveries
  const currentDeliveries = await db.all(`
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
  `, [driver.id]);

  // Get stats
  const stats = await db.get(`
    SELECT 
      COUNT(*) as total_deliveries,
      SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as completed_deliveries
    FROM orders
    WHERE driver_id = ?
  `, [driver.id]);

  const isOnline = driver.availability === 'online';

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      {/* Header with Online/Offline Toggle */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-ink)]">Driver Dashboard</h1>
          <p className="mt-2 text-[var(--color-muted)]">
            Manage your deliveries and track earnings
          </p>
        </div>
        <form action="/workspace/drivers/toggle-status" method="POST">
          <Button
            type="submit"
            variant={isOnline ? 'secondary' : 'primary'}
          >
            {isOnline ? '🟢 Go Offline' : '⚫ Go Online'}
          </Button>
        </form>
      </div>

      {/* Status Card */}
      <div className={`mb-8 rounded-xl border p-6 ${
        isOnline
          ? 'border-green-200 bg-green-50'
          : 'border-gray-200 bg-gray-50'
      }`}>
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
          <div className="text-5xl">{isOnline ? '🟢' : '⚫'}</div>
        </div>
      </div>

      {/* Stats */}
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
          <p className="mt-2 text-3xl font-semibold text-blue-900">
            {currentDeliveries?.length || 0}
          </p>
        </div>
      </div>

      {/* Current Deliveries */}
      {currentDeliveries && currentDeliveries.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold text-[var(--color-ink)]">
            Current Deliveries
          </h2>
          <div className="space-y-4">
            {(currentDeliveries as any[]).map((order) => (
              <div
                key={order.id}
                className="rounded-xl border border-blue-200 bg-white p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[var(--color-ink)]">
                      Order #{order.order_code}
                    </h3>
                    <p className="mt-2 text-sm text-[var(--color-muted)]">
                      From: {order.merchant_name}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      To: {order.street}, {order.district}, {order.city}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
                      {(order.total_amount / 100).toFixed(2)} {order.currency}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a href={`/workspace/orders/${order.id}`}>
                      <Button>View Order</Button>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Orders */}
      {isOnline && (
        <div>
          <h2 className="mb-4 text-2xl font-semibold text-[var(--color-ink)]">
            Available Deliveries
          </h2>
          {availableOrders && availableOrders.length > 0 ? (
            <div className="space-y-4">
              {(availableOrders as any[]).map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl border border-green-200 bg-white p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[var(--color-ink)]">
                        Order #{order.order_code}
                      </h3>
                      <p className="mt-2 text-sm text-[var(--color-muted)]">
                        From: {order.merchant_name}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        To: {order.street}, {order.district}, {order.city}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
                        {(order.total_amount / 100).toFixed(2)} {order.currency}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <form action="/workspace/drivers/accept-order" method="POST">
                        <input type="hidden" name="orderId" value={order.id} />
                        <Button type="submit">Accept</Button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--color-border)] bg-white p-12 text-center">
              <p className="text-lg text-[var(--color-muted)]">
                No available deliveries right now
              </p>
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
