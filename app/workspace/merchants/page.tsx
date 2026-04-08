import Link from "next/link";
import { SmartSearch } from "@/components/AI/SmartSearch";
import { searchMerchants } from "@/lib/merchant-search";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

function toStringValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MerchantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search = toStringValue(params.search)?.trim() ?? "";
  const cuisine = toStringValue(params.cuisine)?.trim() ?? "";
  const onlyOpen = toStringValue(params.open) === "1";
  const sortBy = toStringValue(params.sortBy);
  const maxDeliveryFee = toStringValue(params.maxDeliveryFee);
  const minRating = toStringValue(params.minRating);

  const result = await searchMerchants({
    search: search || undefined,
    cuisineTags: cuisine ? [cuisine] : [],
    isOpen: onlyOpen ? true : undefined,
    sortBy:
      sortBy === "deliveryFee" || sortBy === "name" || sortBy === "createdAt"
        ? sortBy
        : "rating",
    sortOrder: sortBy === "name" ? "asc" : "desc",
    maxDeliveryFee: maxDeliveryFee ? Number(maxDeliveryFee) : undefined,
    minRating: minRating ? Number(minRating) : undefined,
    limit: 24,
  });

  const cuisineOptions = [
    { value: "", label: "All cuisines" },
    { value: "saudi", label: "Saudi" },
    { value: "arabic", label: "Arabic" },
    { value: "grills", label: "Grills" },
    { value: "bowls", label: "Bowls" },
    { value: "desserts", label: "Desserts" },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f4efe8] to-[#e8ddd0]">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <div className="glass-panel rounded-[2rem] p-6">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[var(--color-muted)]">
            Merchant Directory
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            Restaurants and kitchens
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--color-muted)]">
            Search now runs against the live merchant tables and opening hours, so filters and
            availability reflect the active database instead of a static list.
          </p>

          <div className="mt-6 rounded-[1.6rem] border border-[var(--color-border)] bg-white/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
              Smart search
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
              Search dishes, categories, and merchant profiles from one place. Results now come
              from the live catalog instead of a browser-side Gemini call.
            </p>
            <SmartSearch className="mt-4" />
          </div>

          <form className="mt-6 grid gap-3 rounded-[1.5rem] border border-[var(--color-border)] bg-white/75 p-4 md:grid-cols-[1.4fr_0.9fr_0.8fr_0.8fr_auto]">
            <input
              type="search"
              name="search"
              defaultValue={search}
              placeholder="Search by merchant name or description"
              className="rounded-[1rem] border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)]"
            />
            <select
              name="cuisine"
              defaultValue={cuisine}
              className="rounded-[1rem] border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)]"
            >
              {cuisineOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              name="sortBy"
              defaultValue={sortBy ?? "rating"}
              className="rounded-[1rem] border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)]"
            >
              <option value="rating">Top rated</option>
              <option value="deliveryFee">Lowest delivery fee</option>
              <option value="name">Alphabetical</option>
              <option value="createdAt">Newest</option>
            </select>
            <label className="flex items-center gap-3 rounded-[1rem] border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-ink)]">
              <input type="checkbox" name="open" value="1" defaultChecked={onlyOpen} />
              Open now
            </label>
            <button
              type="submit"
              className="rounded-[1rem] bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Apply
            </button>

            <input type="hidden" name="minRating" value={minRating ?? ""} />
            <input type="hidden" name="maxDeliveryFee" value={maxDeliveryFee ?? ""} />
          </form>

          <p className="mt-4 text-sm text-[var(--color-muted)]">
            {result.total} merchants found
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {result.merchants.length ? (
            result.merchants.map((merchant) => (
              <Link
                key={merchant.id}
                href={`/workspace/merchants/${merchant.slug}`}
                className="overflow-hidden rounded-[1.8rem] border border-[var(--color-border)] bg-white/90 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="h-48 w-full">
                  {merchant.coverImageUrl ? (
                    <img
                      src={merchant.coverImageUrl}
                      alt={merchant.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#d66b42] to-[#b85a35] text-6xl text-white">
                      S
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
                          {merchant.name}
                        </h2>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                            merchant.isOpen
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-stone-200 text-stone-700"
                          }`}
                        >
                          {merchant.isOpen ? "Open" : "Closed"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                        {merchant.description}
                      </p>
                    </div>
                    <div className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm font-medium text-[var(--color-ink)]">
                      {merchant.rating.toFixed(1)}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {merchant.cuisineTags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-medium text-[var(--color-accent-strong)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[1.2rem] bg-[var(--color-surface)]/80 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                        Delivery fee
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                        {formatMoney(merchant.deliveryFeeAmount, merchant.currency)}
                      </p>
                    </div>
                    <div className="rounded-[1.2rem] bg-[var(--color-surface)]/80 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                        Minimum order
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                        {formatMoney(merchant.minimumOrderAmount, merchant.currency)}
                      </p>
                    </div>
                    <div className="rounded-[1.2rem] bg-[var(--color-surface)]/80 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                        Next opening
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                        {merchant.isOpen ? "Serving now" : merchant.nextOpenHour ?? "Unavailable"}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="glass-panel rounded-[1.8rem] p-8 text-center text-[var(--color-muted)]">
              No merchants match the current search.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
