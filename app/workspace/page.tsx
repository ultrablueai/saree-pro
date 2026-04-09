import { requireSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/Button';

const workspaceConfig = {
  customer: {
    title: 'Customer Workspace',
    description: 'Browse merchants, place orders, and track deliveries',
    color: 'blue',
    links: [
      { label: 'Browse Merchants', href: '/workspace/merchants' },
      { label: 'My Orders', href: '/workspace/orders' },
      { label: 'My Addresses', href: '/workspace/addresses' },
      { label: 'Profile', href: '/workspace/profile' },
    ],
  },
  merchant: {
    title: 'Merchant Dashboard',
    description: 'Manage your store, menu items, and orders',
    color: 'green',
    links: [
      { label: 'Dashboard', href: '/workspace/merchants' },
      { label: 'Manage Menu', href: '/workspace/merchants/menu' },
      { label: 'Incoming Orders', href: '/workspace/merchants/orders' },
      { label: 'Store Settings', href: '/workspace/merchants/settings' },
      { label: 'Profile', href: '/workspace/profile' },
    ],
  },
  driver: {
    title: 'Driver Dashboard',
    description: 'Accept deliveries, navigate routes, and track earnings',
    color: 'orange',
    links: [
      { label: 'Available Deliveries', href: '/workspace/drivers' },
      { label: 'My Deliveries', href: '/workspace/drivers/deliveries' },
      { label: 'Earnings', href: '/workspace/drivers/earnings' },
      { label: 'Profile', href: '/workspace/profile' },
    ],
  },
  admin: {
    title: 'Admin Console',
    description: 'Manage users, merchants, and platform operations',
    color: 'purple',
    links: [
      { label: 'Dashboard', href: '/workspace/admin' },
      { label: 'Users', href: '/workspace/admin/users' },
      { label: 'Merchants', href: '/workspace/admin/merchants' },
      { label: 'Orders', href: '/workspace/admin/orders' },
      { label: 'Profile', href: '/workspace/profile' },
    ],
  },
  owner: {
    title: 'Owner Console',
    description: 'Full platform control, analytics, and financial management',
    color: 'red',
    links: [
      { label: 'Dashboard', href: '/owner-access' },
      { label: 'Financial Analytics', href: '/owner-access/finance' },
      { label: 'Platform Settings', href: '/owner-access/settings' },
      { label: 'Profile', href: '/workspace/profile' },
    ],
  },
};

export default async function WorkspacePage() {
  const session = await requireSessionUser();

  const config = workspaceConfig[session.role as keyof typeof workspaceConfig];

  if (!config) {
    redirect('/login');
  }

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <span className={`rounded-full border px-4 py-2 text-sm font-semibold ${colorClasses[config.color as keyof typeof colorClasses]}`}>
            {session.role.toUpperCase()}
          </span>
          <h1 className="text-3xl font-semibold text-[var(--color-ink)]">{config.title}</h1>
        </div>
        <p className="mt-3 text-[var(--color-muted)]">{config.description}</p>
      </div>

      {/* Welcome Card */}
      <div className="mb-8 rounded-2xl border border-[var(--color-border)] bg-gradient-to-r from-[var(--color-surface)] to-white p-6">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">
          Welcome back, {session.name}!
        </h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          {session.email}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {config.links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl border border-[var(--color-border)] bg-white p-6 transition hover:border-[var(--color-accent)] hover:shadow-md"
          >
            <h3 className="text-lg font-semibold text-[var(--color-ink)]">{link.label}</h3>
            <p className="mt-2 text-sm text-[var(--color-muted)]">Click to access</p>
          </Link>
        ))}
      </div>

      {/* Sign Out */}
      <div className="mt-8">
        <form action="/login" method="get">
          <Button type="submit" variant="secondary">
            Sign Out
          </Button>
        </form>
      </div>
    </main>
  );
}
