"use client";

import { useActionState } from "react";
import { Button } from "@/components/Button";
import { StatusPill } from "@/components/StatusPill";
import {
  placeCustomerOrder,
  type CustomerOrderActionState,
} from "@/app/workspace/customer-actions";
import type { CustomerOrderWorkspaceData } from "@/lib/customer-order-data";

const initialState: CustomerOrderActionState = {
  status: "idle",
  message: "",
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

interface CustomerOrderPanelProps {
  data: CustomerOrderWorkspaceData;
}

export function CustomerOrderPanel({ data }: CustomerOrderPanelProps) {
  const [state, action, isPending] = useActionState(placeCustomerOrder, initialState);

  if (!data.merchant) {
    return (
      <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-white/80 p-6">
        <StatusPill label="No merchant" tone="warning" />
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          No active merchant is available
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
          The customer flow needs at least one active merchant in the local database.
        </p>
      </section>
    );
  }

  const groupedItems = data.categories.length
    ? data.categories.map((category) => ({
        ...category,
        items: data.items.filter((item) => item.category_id === category.id),
      }))
    : [
        {
          id: "uncategorized",
          name: "Uncategorized",
          sort_order: 0,
          items: data.items.filter((item) => !item.category_id),
        },
      ];

  const uncategorizedItems = data.items.filter(
    (item) => !item.category_id && !groupedItems.some((group) => group.items.includes(item)),
  );

  const finalGroups = uncategorizedItems.length
    ? [
        ...groupedItems,
        {
          id: "uncategorized-extra",
          name: "Uncategorized",
          sort_order: 999,
          items: uncategorizedItems,
        },
      ]
    : groupedItems;

  return (
    <section className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="glass-panel rounded-[1.7rem] p-6">
          <StatusPill label={data.merchant.status} tone="success" />
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            {data.merchant.name}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            {data.merchant.description}
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Delivery fee</p>
              <p className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
                {formatCurrency(data.merchant.delivery_fee_amount, data.merchant.currency)}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Minimum order</p>
              <p className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
                {formatCurrency(data.merchant.minimum_order_amount, data.merchant.currency)}
              </p>
            </div>
          </div>
        </article>

        <article className="glass-panel rounded-[1.7rem] p-6">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Delivery address
          </h2>
          {data.address ? (
            <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--color-muted)]">
              <p>
                <span className="font-semibold text-[var(--color-ink)]">
                  {data.address.label ?? "Primary address"}
                </span>
              </p>
              <p>
                {data.address.street} {data.address.building},{" "}
                {data.address.district ?? "District"}, {data.address.city}
              </p>
              <p>{data.address.notes ?? "No delivery note."}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--color-muted)]">
              Add a delivery address before placing an order.
            </p>
          )}
        </article>
      </div>

      <form action={action} className="glass-panel space-y-6 rounded-[1.75rem] p-6">
        <input type="hidden" name="merchantId" value={data.merchant.id} />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-accent-strong)]">
              Customer order
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              Select items and send a real order
            </h3>
          </div>
          <div className="rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-sm text-[var(--color-muted)]">
            Total updates after submission
          </div>
        </div>

        {finalGroups.map((group) => (
          <div key={group.id} className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h4 className="text-lg font-semibold text-[var(--color-ink)]">{group.name}</h4>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
                {group.items.length} items
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {group.items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.5rem] border border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(250,243,235,0.88))] p-5 shadow-[0_18px_40px_-34px_rgba(28,25,23,0.3)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h5 className="text-lg font-semibold text-[var(--color-ink)]">{item.name}</h5>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                        {item.description}
                      </p>
                    </div>
                    <StatusPill label={item.is_available ? "available" : "paused"} />
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-4">
                    <p className="text-base font-semibold text-[var(--color-ink)]">
                  {formatCurrency(item.price_amount, item.currency)}
                </p>
                    <label className="min-w-24 space-y-1 text-sm font-medium text-[var(--color-ink)]">
                      Qty
                      <select
                        name={`qty_${item.id}`}
                        defaultValue="0"
                        disabled={!item.is_available}
                        className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-3 py-2 outline-none transition focus:border-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {Array.from({ length: 6 }, (_, index) => (
                          <option key={index} value={index}>
                            {index}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <input type="hidden" name={`item_${item.id}`} value={item.id} />
                </article>
              ))}
            </div>
          </div>
        ))}

        <div className="grid gap-4 lg:grid-cols-[1fr_0.45fr]">
          <label className="space-y-2 text-sm font-medium text-[var(--color-ink)]">
            Optional note
            <textarea
              name="note"
              placeholder="E.g. extra sauce, call on arrival"
              className="min-h-28 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-accent)]"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-[var(--color-ink)]">
            Payment method
            <select
              name="paymentMethod"
              defaultValue="cash"
              className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-accent)]"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="wallet">Wallet</option>
            </select>
          </label>
        </div>

        {state.message ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              state.status === "error"
                ? "border-rose-200 bg-rose-50 text-rose-900"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
            }`}
          >
            {state.message}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-[var(--color-muted)]">
            Only the signed-in customer can submit this order.
          </p>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Placing order..." : "Place order"}
          </Button>
        </div>
      </form>
    </section>
  );
}
