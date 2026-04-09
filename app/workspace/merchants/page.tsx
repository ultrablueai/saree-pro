import { requireRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDbExecutor } from '@/lib/db';

export default async function MerchantDashboardPage() {
  const session = await requireRole(['merchant', 'admin', 'owner']);

  const db = await getDbExecutor();

  // Get merchant data
  const merchant = await db.get(`
    SELECT m.*, u.full_name as owner_name
    FROM merchants m
    JOIN app_users u ON m.owner_user_id = u.id
    WHERE u.id = ?
  `, [session.id]);

  if (!merchant) {
    redirect('/workspace/merchants/setup');
  }

  // Get stats
  const stats = await db.get(`
    SELECT 
      COUNT(*) as total_orders,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
      SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_orders,
      SUM(total_amount) as total_revenue
    FROM orders
    WHERE merchant_id = ?
  `, [merchant.id]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-[var(--color-ink)]">
          {merchant.name}
        </h1>
        <p className="mt-2 text-[var(--color-muted)]">{merchant.description}</p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-6">
          <p className="text-sm text-[var(--color-muted)]">Total Orders</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--color-ink)]">
            {stats?.total_orders || 0}
          </p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
          <p className="text-sm text-orange-700">Pending Orders</p>
          <p className="mt-2 text-3xl font-semibold text-orange-900">
            {stats?.pending_orders || 0}
          </p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
          <p className="text-sm text-blue-700">Confirmed</p>
          <p className="mt-2 text-3xl font-semibold text-blue-900">
            {stats?.confirmed_orders || 0}
          </p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-6">
          <p className="text-sm text-green-700">Total Revenue</p>
          <p className="mt-2 text-3xl font-semibold text-green-900">
            {((stats?.total_revenue || 0) / 100).toFixed(2)} {merchant.currency}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <a
          href="/workspace/merchants/orders"
          className="rounded-xl border border-[var(--color-border)] bg-white p-6 transition hover:border-[var(--color-accent)] hover:shadow-md"
        >
          <h3 className="text-lg font-semibold text-[var(--color-ink)]">Manage Orders</h3>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            View and process incoming orders
          </p>
        </a>
        <a
          href="/workspace/merchants/menu"
          className="rounded-xl border border-[var(--color-border)] bg-white p-6 transition hover:border-[var(--color-accent)] hover:shadow-md"
        >
          <h3 className="text-lg font-semibold text-[var(--color-ink)]">Edit Menu</h3>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Update items, prices, and availability
          </p>
        </a>
        <a
          href="/workspace/merchants/settings"
          className="rounded-xl border border-[var(--color-border)] bg-white p-6 transition hover:border-[var(--color-accent)] hover:shadow-md"
        >
          <h3 className="text-lg font-semibold text-[var(--color-ink)]">Store Settings</h3>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Configure hours, fees, and appearance
          </p>
        </a>
      </div>
    </main>
  );
}
