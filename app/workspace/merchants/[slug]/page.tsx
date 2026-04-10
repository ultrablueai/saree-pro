import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/Button";
import SurgePricingIndicator from "@/components/SurgePricing/SurgePricingIndicator";
import { getDbExecutor } from "@/lib/db";
import { getMerchantBySlug } from "@/lib/merchant-search";
import { MerchantMenu } from "./merchant-menu";

interface MenuItemDetail {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  priceAmount: number;
  isAvailable: number;
  categoryName: string | null;
}

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function MerchantDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const merchant = await getMerchantBySlug(slug);

  if (!merchant) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6 py-16">
        <div className="glass-panel w-full rounded-[2rem] p-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            Merchant not found
          </h1>
          <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
            The requested merchant profile is not available in the current database.
          </p>
          <div className="mt-6">
            <Link href="/workspace/merchants">
              <Button variant="secondary">Back to merchants</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const db = await getDbExecutor();
  const menuItems = await db.all<MenuItemDetail>(
    `SELECT
       mi.id,
       mi.name,
       mi.description,
       mi.image_url as imageUrl,
       mi.price_amount as priceAmount,
       CASE WHEN mi.is_available THEN 1 ELSE 0 END as isAvailable,
       mc.name as categoryName
     FROM menu_items mi
     LEFT JOIN menu_categories mc ON mc.id = mi.category_id
     WHERE mi.merchant_id = ?
     ORDER BY COALESCE(mc.sort_order, 0) ASC, mi.sort_order ASC, mi.created_at DESC`,
    [merchant.id],
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f4efe8] to-[#e8ddd0] pb-16">
      <div className="relative h-64 md:h-80">
        {merchant.coverImageUrl ? (
          <Image
            src={merchant.coverImageUrl}
            alt={merchant.name}
            fill
            priority
            sizes="100vw"
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#d66b42] to-[#b85a35]">
            <span className="text-7xl text-white">S</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto -mt-28 max-w-7xl px-4 sm:px-8">
        <section className="glass-panel rounded-[2rem] p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-[var(--color-muted)]">
                Merchant profile
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
                  {merchant.name}
                </h1>
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                    merchant.isOpen
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-stone-200 text-stone-700"
                  }`}
                >
                  {merchant.isOpen ? "Open now" : "Closed"}
                </span>
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--color-muted)]">
                {merchant.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {merchant.cuisineTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[var(--color-border)] bg-white/75 px-3 py-1 text-sm text-[var(--color-muted)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid min-w-64 gap-3 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-[var(--color-border)] bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">Rating</p>
                <p className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
                  {merchant.rating.toFixed(1)}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-[var(--color-border)] bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">Status</p>
                <p className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
                  {merchant.isOpen ? "Serving now" : merchant.nextOpenHour ?? merchant.status}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-[var(--color-border)] bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                  Delivery fee
                </p>
                <p className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
                  {(merchant.deliveryFeeAmount / 100).toFixed(2)} {merchant.currency}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-[var(--color-border)] bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                  Minimum order
                </p>
                <p className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
                  {(merchant.minimumOrderAmount / 100).toFixed(2)} {merchant.currency}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-[var(--color-border)] bg-white/75 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
              Opening hours
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {merchant.hours.length ? (
                merchant.hours.map((hour) => (
                  <div
                    key={`${hour.dayOfWeek}-${hour.opensAt}`}
                    className="rounded-[1rem] bg-[var(--color-surface)]/80 px-3 py-3 text-sm text-[var(--color-muted)]"
                  >
                    <p className="font-semibold text-[var(--color-ink)]">
                      {dayLabels[hour.dayOfWeek] ?? `Day ${hour.dayOfWeek}`}
                    </p>
                    <p className="mt-1">
                      {hour.isClosed ? "Closed" : `${hour.opensAt} - ${hour.closesAt}`}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--color-muted)]">
                  Hours have not been configured yet.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <SurgePricingIndicator
              locationId={merchant.slug}
              merchantId={merchant.id}
              baseFee={merchant.deliveryFeeAmount / 100}
            />
          </div>
        </section>

        <MerchantMenu
          merchant={{
            id: merchant.id,
            slug: merchant.slug,
            name: merchant.name,
            deliveryFeeAmount: merchant.deliveryFeeAmount,
            minimumOrderAmount: merchant.minimumOrderAmount,
            currency: merchant.currency,
          }}
          menuItems={menuItems.map((item) => ({
            ...item,
            isAvailable: Boolean(item.isAvailable),
          }))}
        />
      </div>
    </main>
  );
}
