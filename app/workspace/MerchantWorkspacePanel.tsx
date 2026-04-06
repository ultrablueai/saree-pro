import Link from "next/link";
import { Button } from "@/components/Button";
import { StatusPill } from "@/components/StatusPill";
import {
  advanceMerchantOrderStatus,
  createMerchantCategory,
  createMerchantMenuItem,
  deleteMerchantMenuItem,
  toggleMerchantMenuItemAvailability,
  toggleMerchantStatus,
  updateMerchantMenuItem,
} from "@/app/workspace/merchant-actions";

interface MerchantWorkspacePanelProps {
  data: {
    merchant: {
      id: string;
      name: string;
      status: string;
      rating: number;
      delivery_fee_amount: number;
      minimum_order_amount: number;
      currency: string;
    };
    menuCount: number;
    activeOrders: number;
    recentOrders: Array<{
      id: string;
      order_code: string;
      status: string;
      total_amount: number;
      currency: string;
      created_at: string;
    }>;
    kitchenQueue: Array<{
      id: string;
      order_code: string;
      status: string;
      total_amount: number;
      currency: string;
      created_at: string;
      special_instructions: string | null;
      customer_name: string;
      item_count: number;
    }>;
    categories: Array<{
      id: string;
      name: string;
      sort_order: number;
      item_count: number;
    }>;
    menuItems: Array<{
      id: string;
      name: string;
      description: string;
      price_amount: number;
      currency: string;
      is_available: number;
      sort_order: number;
      category_id: string | null;
      category_name: string;
    }>;
  };
  formatCurrency: (amount: number, currency: string) => string;
  formatDate: (value: string) => string;
}

function getMerchantQueueAction(status: string) {
  if (status === "pending") {
    return { nextStatus: "confirmed", label: "Confirm order" };
  }

  if (status === "confirmed") {
    return { nextStatus: "preparing", label: "Start preparing" };
  }

  if (status === "preparing") {
    return { nextStatus: "ready", label: "Mark ready" };
  }

  return null;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">{label}</p>
      <p className="mt-2 text-xl font-semibold text-[var(--color-ink)]">{value}</p>
    </div>
  );
}

export function MerchantWorkspacePanel({
  data,
  formatCurrency,
  formatDate,
}: MerchantWorkspacePanelProps) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="metric-card">
          <p className="section-kicker">Brand</p>
          <h2 className="mt-3 text-xl font-semibold text-[var(--color-ink)]">
            Merchant operating system
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
            Catalog control, kitchen movement, and order readiness in one command surface.
          </p>
        </article>
        <article className="metric-card">
          <p className="section-kicker">Flow</p>
          <h2 className="mt-3 text-xl font-semibold text-[var(--color-ink)]">
            Kitchen-first actions
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
            Confirm, prepare, and release orders with minimal friction for busy teams.
          </p>
        </article>
        <article className="metric-card">
          <p className="section-kicker">Conversion</p>
          <h2 className="mt-3 text-xl font-semibold text-[var(--color-ink)]">
            Menu discipline
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
            Availability, pricing, categories, and item order stay controlled from one place.
          </p>
        </article>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <article className="glass-panel rounded-[1.8rem] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="section-kicker">Store control</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
                {data.merchant.name}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
                Keep service stable, pricing clear, and kitchen flow visible for the team.
              </p>
            </div>
            <form action={toggleMerchantStatus}>
              <Button type="submit" variant="secondary">
                {data.merchant.status === "active" ? "Pause store" : "Open store"}
              </Button>
            </form>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <MetricCard label="Status" value={data.merchant.status} />
            <MetricCard label="Menu items" value={data.menuCount.toString()} />
            <MetricCard
              label="Delivery fee"
              value={formatCurrency(
                data.merchant.delivery_fee_amount,
                data.merchant.currency,
              )}
            />
            <MetricCard
              label="Minimum order"
              value={formatCurrency(
                data.merchant.minimum_order_amount,
                data.merchant.currency,
              )}
            />
          </div>
        </article>

        <article className="glass-panel rounded-[1.8rem] p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="section-kicker">Kitchen queue</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
                Active preparation board
              </h2>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                Open operational orders: {data.activeOrders}
              </p>
            </div>
            <div className="rounded-full border border-[var(--color-border)] bg-white/70 px-4 py-2 text-sm text-[var(--color-muted)]">
              Service pace live
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {data.kitchenQueue.length ? (
              data.kitchenQueue.map((order) => {
                const queueAction = getMerchantQueueAction(order.status);

                return (
                  <div
                    key={order.id}
                    className="rounded-[1.5rem] border border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,239,230,0.85))] p-4 shadow-[0_18px_40px_-34px_rgba(28,25,23,0.3)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-[var(--color-ink)]">{order.order_code}</p>
                        <p className="text-sm text-[var(--color-muted)]">{order.customer_name}</p>
                      </div>
                      <StatusPill label={order.status} />
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-[var(--color-muted)] sm:grid-cols-2">
                      <p>{formatCurrency(order.total_amount, order.currency)}</p>
                      <p>{order.item_count} items</p>
                      <p>{formatDate(order.created_at)}</p>
                      <p>{order.special_instructions ?? "No special note"}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/workspace/orders/${order.id}`}
                        className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-white/80 px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-white"
                      >
                        View details
                      </Link>
                      {queueAction ? (
                        <form action={advanceMerchantOrderStatus}>
                          <input type="hidden" name="orderId" value={order.id} />
                          <input type="hidden" name="nextStatus" value={queueAction.nextStatus} />
                          <Button type="submit">{queueAction.label}</Button>
                        </form>
                      ) : null}

                      {order.status !== "ready" && order.status !== "cancelled" ? (
                        <form action={advanceMerchantOrderStatus}>
                          <input type="hidden" name="orderId" value={order.id} />
                          <input type="hidden" name="nextStatus" value="cancelled" />
                          <Button type="submit" variant="ghost">
                            Cancel order
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-sm text-[var(--color-muted)]">
                No open kitchen orders yet.
              </div>
            )}
          </div>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <article className="glass-panel rounded-[1.8rem] p-6">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Categories
          </h2>
          <form action={createMerchantCategory} className="mt-5 space-y-4">
            <input
              type="text"
              name="name"
              placeholder="New category name"
              className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)]"
              required
            />
            <input
              type="number"
              name="sortOrder"
              placeholder="Sort order"
              className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={data.categories.length + 1}
            />
            <Button type="submit" className="w-full">
              Add category
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            {data.categories.map((category) => (
              <div
                key={category.id}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-semibold text-[var(--color-ink)]">{category.name}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
                    {category.item_count} items
                  </p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-panel rounded-[1.8rem] p-6">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Menu management
          </h2>

          <form action={createMerchantMenuItem} className="mt-5 grid gap-4 lg:grid-cols-2">
            <input
              type="text"
              name="name"
              placeholder="Item name"
              className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)]"
              required
            />
            <input
              type="number"
              name="price"
              step="0.01"
              min="0.01"
              placeholder="Price"
              className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)]"
              required
            />
            <textarea
              name="description"
              placeholder="Item description"
              className="min-h-28 rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)] lg:col-span-2"
              required
            />
            <select
              name="categoryId"
              className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)]"
              defaultValue=""
            >
              <option value="">Uncategorized</option>
              {data.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              name="sortOrder"
              defaultValue={data.menuItems.length + 1}
              placeholder="Sort order"
              className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)]"
            />
            <div className="lg:col-span-2">
              <Button type="submit">Add menu item</Button>
            </div>
          </form>

          <div className="mt-8 space-y-4">
            {data.menuItems.map((item) => (
              <div
                key={item.id}
                className="rounded-[1.5rem] border border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,239,230,0.85))] p-4 shadow-[0_18px_40px_-34px_rgba(28,25,23,0.3)]"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--color-ink)]">{item.name}</p>
                    <p className="text-sm text-[var(--color-muted)]">{item.category_name}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill label={item.is_available ? "available" : "paused"} />
                    <form action={toggleMerchantMenuItemAvailability}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="nextValue" value={item.is_available ? "0" : "1"} />
                      <Button type="submit" variant="secondary">
                        {item.is_available ? "Pause" : "Activate"}
                      </Button>
                    </form>
                    <form action={deleteMerchantMenuItem}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <Button type="submit" variant="ghost">
                        Delete
                      </Button>
                    </form>
                  </div>
                </div>

                <form action={updateMerchantMenuItem} className="grid gap-3 lg:grid-cols-2">
                  <input type="hidden" name="itemId" value={item.id} />
                  <input
                    type="text"
                    name="name"
                    defaultValue={item.name}
                    className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)]"
                    required
                  />
                  <input
                    type="number"
                    name="price"
                    step="0.01"
                    min="0.01"
                    defaultValue={(item.price_amount / 100).toFixed(2)}
                    className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)]"
                    required
                  />
                  <textarea
                    name="description"
                    defaultValue={item.description}
                    className="min-h-24 rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)] lg:col-span-2"
                    required
                  />
                  <select
                    name="categoryId"
                    defaultValue={item.category_id ?? ""}
                    className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)]"
                  >
                    <option value="">Uncategorized</option>
                    {data.categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    name="sortOrder"
                    defaultValue={item.sort_order}
                    className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)]"
                  />
                  <div className="lg:col-span-2">
                    <Button type="submit">Save changes</Button>
                  </div>
                </form>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="glass-panel rounded-[1.8rem] p-6">
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Recent order history
        </h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.recentOrders.map((order) => (
            <div
              key={order.id}
              className="rounded-2xl border border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,239,230,0.82))] px-4 py-3 shadow-[0_16px_34px_-30px_rgba(28,25,23,0.28)]"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold text-[var(--color-ink)]">{order.order_code}</p>
                <StatusPill label={order.status} />
              </div>
              <p className="mt-3 text-sm text-[var(--color-muted)]">
                {formatCurrency(order.total_amount, order.currency)} • {formatDate(order.created_at)}
              </p>
              <Link
                href={`/workspace/orders/${order.id}`}
                className="mt-3 inline-block text-sm font-medium text-[var(--color-accent-strong)] transition hover:opacity-80"
              >
                View details
              </Link>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
