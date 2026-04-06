import Link from "next/link";
import { CustomerOrderPanel } from "@/app/workspace/CustomerOrderPanel";
import { StatusPill } from "@/components/StatusPill";
import type { CustomerOrderWorkspaceData } from "@/lib/customer-order-data";

interface CustomerWorkspacePanelProps {
  data: {
    address:
      | {
          label: string | null;
          street: string;
          building: string;
          district: string | null;
          city: string;
          notes: string | null;
        }
      | undefined;
    orders: Array<{
      id: string;
      order_code: string;
      status: string;
      payment_status: string;
      payment_method: string;
      total_amount: number;
      currency: string;
      created_at: string;
      merchant_name: string;
      escrow_status: string | null;
    }>;
    ordering: CustomerOrderWorkspaceData;
  };
  formatCurrency: (amount: number, currency: string) => string;
  formatDate: (value: string) => string;
}

function getStatusStep(status: string) {
  const sequence = ["pending", "confirmed", "preparing", "ready", "picked_up", "delivered"];
  const index = sequence.indexOf(status);
  return index === -1 ? 0 : index + 1;
}

export function CustomerWorkspacePanel({
  data,
  formatCurrency,
  formatDate,
}: CustomerWorkspacePanelProps) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="metric-card">
          <p className="section-kicker">Precision</p>
          <h2 className="mt-3 text-xl font-semibold text-[var(--color-ink)]">
            Address intelligence
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
            Building, district, and notes stay visible through checkout and delivery.
          </p>
        </article>
        <article className="metric-card">
          <p className="section-kicker">Trust</p>
          <h2 className="mt-3 text-xl font-semibold text-[var(--color-ink)]">
            Escrow-protected orders
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
            Payment state and release visibility stay clear from order creation to completion.
          </p>
        </article>
        <article className="metric-card">
          <p className="section-kicker">Speed</p>
          <h2 className="mt-3 text-xl font-semibold text-[var(--color-ink)]">
            Live order progress
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
            Every order keeps a visible stage bar so the customer is never left guessing.
          </p>
        </article>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="glass-panel rounded-[1.7rem] p-6">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Delivery profile
          </h2>
          {data.address ? (
            <div className="mt-5 space-y-3 text-sm leading-6 text-[var(--color-muted)]">
              <p>
                <span className="font-semibold text-[var(--color-ink)]">Address:</span>{" "}
                {data.address.label ?? "Primary address"}
              </p>
              <p>
                {data.address.street} {data.address.building},{" "}
                {data.address.district ?? "District"}, {data.address.city}
              </p>
              <p>{data.address.notes ?? "No driver note yet."}</p>
            </div>
          ) : (
            <p className="mt-5 text-sm text-[var(--color-muted)]">No saved address found yet.</p>
          )}
        </article>

        <article className="glass-panel rounded-[1.7rem] p-6">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Recent orders
          </h2>
          <div className="mt-5 space-y-4">
            {data.orders.length ? (
              data.orders.map((order) => (
                <div
                  key={order.order_code}
                  className="rounded-[1.5rem] border border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(247,239,230,0.82))] px-4 py-4 shadow-[0_18px_40px_-34px_rgba(28,25,23,0.3)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--color-ink)]">{order.order_code}</p>
                      <p className="text-sm text-[var(--color-muted)]">{order.merchant_name}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusPill label={order.status} />
                      <StatusPill
                        label={order.escrow_status ?? order.payment_status}
                        tone="warning"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--color-muted)]">
                    <p>{formatCurrency(order.total_amount, order.currency)}</p>
                    <p>{formatDate(order.created_at)}</p>
                    <p>{order.payment_method}</p>
                  </div>

                  <div className="mt-4">
                    <Link
                      href={`/workspace/orders/${order.id}`}
                      className="text-sm font-medium text-[var(--color-accent-strong)] transition hover:opacity-80"
                    >
                      View details
                    </Link>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
                      <span>Order progress</span>
                      <span>{getStatusStep(order.status)}/6</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-accent)] transition-all"
                        style={{ width: `${(getStatusStep(order.status) / 6) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-sm text-[var(--color-muted)]">
                No orders yet.
              </div>
            )}
          </div>
        </article>
      </div>

      <CustomerOrderPanel data={data.ordering} />
    </div>
  );
}
