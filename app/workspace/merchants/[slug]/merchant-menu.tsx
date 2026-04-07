import Link from "next/link";
import { Button } from "@/components/Button";

interface MerchantSummary {
  id: string;
  slug: string;
  name: string;
  deliveryFeeAmount: number;
  minimumOrderAmount: number;
  currency: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  priceAmount: number;
  isAvailable: boolean;
  categoryName: string | null;
}

interface MerchantMenuProps {
  merchant: MerchantSummary;
  menuItems: MenuItem[];
}

export function MerchantMenu({ merchant, menuItems }: MerchantMenuProps) {
  const groupedMenuItems = menuItems.reduce<Record<string, MenuItem[]>>((acc, item) => {
    const category = item.categoryName ?? "Chef selection";
    acc[category] ??= [];
    acc[category].push(item);
    return acc;
  }, {});

  const estimatedSubtotal = menuItems
    .filter((item) => item.isAvailable)
    .slice(0, 2)
    .reduce((sum, item) => sum + item.priceAmount, 0);

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-[1.8fr_0.8fr]">
      <div className="space-y-6">
        {Object.keys(groupedMenuItems).length ? (
          Object.entries(groupedMenuItems).map(([category, items]) => (
            <article key={category} className="rounded-[1.8rem] bg-white/90 p-6 shadow-sm">
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
                {category}
              </h2>
              <div className="mt-5 space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 rounded-[1.4rem] border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-4"
                  >
                    <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-[1rem]">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#d66b42] to-[#b85a35] text-3xl text-white">
                          S
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <h3 className="text-lg font-semibold text-[var(--color-ink)]">
                            {item.name}
                          </h3>
                          <p className="text-lg font-semibold text-[var(--color-accent-strong)]">
                            {(item.priceAmount / 100).toFixed(2)} {merchant.currency}
                          </p>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                          {item.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm font-medium ${
                            item.isAvailable ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {item.isAvailable ? "Available for ordering" : "Currently unavailable"}
                        </span>
                        <Link href={`/login?redirect=/workspace/merchants/${merchant.slug}`}>
                          <Button variant={item.isAvailable ? "primary" : "ghost"}>
                            {item.isAvailable ? "Sign in to order" : "View later"}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))
        ) : (
          <article className="rounded-[1.8rem] bg-white/90 p-8 text-center shadow-sm">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              Menu is being prepared
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
              This merchant profile exists, but no live menu items have been published yet.
            </p>
          </article>
        )}
      </div>

      <aside className="rounded-[1.8rem] bg-[var(--color-ink)] p-6 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
          Order preview
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">Ready when you are</h2>
        <p className="mt-3 text-sm leading-6 text-white/72">
          Browse the live menu, then continue into an authenticated workspace to build the cart and
          complete checkout.
        </p>

        <div className="mt-6 space-y-3 rounded-[1.4rem] border border-white/10 bg-white/8 p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/65">Sample subtotal</span>
            <span className="font-semibold">
              {(estimatedSubtotal / 100).toFixed(2)} {merchant.currency}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/65">Delivery fee</span>
            <span className="font-semibold">
              {(merchant.deliveryFeeAmount / 100).toFixed(2)} {merchant.currency}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 pt-3 text-sm">
            <span className="text-white/65">Minimum order</span>
            <span className="font-semibold">
              {(merchant.minimumOrderAmount / 100).toFixed(2)} {merchant.currency}
            </span>
          </div>
        </div>

        <div className="mt-6">
          <Link href={`/login?redirect=/workspace/merchants/${merchant.slug}`}>
            <Button className="w-full">Open workspace to order</Button>
          </Link>
        </div>
      </aside>
    </section>
  );
}
