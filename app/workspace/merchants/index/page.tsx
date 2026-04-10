import Image from 'next/image';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { getDbExecutor } from '@/lib/db';

interface MerchantIndexRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  cover_image_url: string | null;
  rating: number;
  avg_rating: number | null;
  cuisine_tags: string;
  delivery_fee_amount: number;
  minimum_order_amount: number;
  currency: string;
  total_orders: number;
}

export default async function MerchantsPage() {
  await requireRole(['customer', 'admin', 'owner']);

  const db = await getDbExecutor();

  const merchants = (await db.all(
    `
    SELECT
      m.*,
      u.full_name as owner_name,
      u.email as owner_email,
      COUNT(DISTINCT o.id) as total_orders,
      AVG(DISTINCT r.rating) as avg_rating
    FROM merchants m
    JOIN app_users u ON m.owner_user_id = u.id
    LEFT JOIN orders o ON m.id = o.merchant_id AND o.status != 'cancelled'
    LEFT JOIN reviews r ON m.id = r.merchant_id
    WHERE m.status = 'active'
    GROUP BY m.id
    ORDER BY m.rating DESC, m.created_at DESC
  `
  )) as MerchantIndexRow[];

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-[var(--color-ink)]">Restaurants & Stores</h1>
        <p className="mt-2 text-[var(--color-muted)]">
          Browse and order from your favorite merchants
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <input
          type="text"
          placeholder="Search merchants or cuisines..."
          className="flex-1 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(214,107,66,0.18)]"
        />
        <select className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(214,107,66,0.18)]">
          <option value="">All Cuisines</option>
          <option value="pizza">Pizza</option>
          <option value="burger">Burger</option>
          <option value="indian">Indian</option>
          <option value="chinese">Chinese</option>
          <option value="arabic">Arabic</option>
        </select>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {merchants.length > 0 ? (
          merchants.map((merchant) => (
            <Link
              key={merchant.id}
              href={`/workspace/merchants/${merchant.slug}`}
              className="group rounded-xl border border-[var(--color-border)] bg-white overflow-hidden transition hover:border-[var(--color-accent)] hover:shadow-lg"
            >
              <div className="relative h-40 bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-border)]">
                {merchant.cover_image_url ? (
                  <Image
                    src={merchant.cover_image_url}
                    alt={merchant.name}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-6xl">ðŸª</div>
                )}
                <div className="absolute right-3 top-3 rounded-full bg-white px-3 py-1 text-sm font-semibold shadow-md">
                  â­ {merchant.avg_rating?.toFixed(1) || merchant.rating.toFixed(1)}
                </div>
              </div>

              <div className="p-5">
                <h3 className="text-lg font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-accent-strong)]">
                  {merchant.name}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm text-[var(--color-muted)]">
                  {merchant.description}
                </p>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-[var(--color-muted)]">ðŸ½ï¸ {merchant.cuisine_tags}</span>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-[var(--color-accent-strong)]">
                    Delivery: {(merchant.delivery_fee_amount / 100).toFixed(2)} {merchant.currency}
                  </span>
                  <span className="text-[var(--color-muted)]">
                    Min: {(merchant.minimum_order_amount / 100).toFixed(2)} {merchant.currency}
                  </span>
                </div>

                <div className="mt-3 text-xs text-[var(--color-muted)]">
                  {merchant.total_orders} orders
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full rounded-xl border border-[var(--color-border)] bg-white p-12 text-center">
            <p className="text-lg text-[var(--color-muted)]">No merchants available yet</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Check back later for new restaurants and stores
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
