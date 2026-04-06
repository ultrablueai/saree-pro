import Link from "next/link";
import { Button } from "@/components/Button";
import { StatusPill } from "@/components/StatusPill";
import {
  claimDriverOrder,
  completeDriverOrder,
  updateDriverAvailability,
} from "@/app/workspace/driver-actions";

interface DriverWorkspacePanelProps {
  data: {
    driver: {
      id: string;
      vehicle_type: string;
      is_verified: number;
      availability: string;
      license_number: string | null;
    };
    availableOrders: Array<{
      id: string;
      order_code: string;
      status: string;
      total_amount: number;
      currency: string;
      created_at: string;
      merchant_name: string;
      street: string;
      building: string;
      district: string | null;
      city: string;
    }>;
    assignedOrders: Array<{
      id: string;
      order_code: string;
      status: string;
      total_amount: number;
      currency: string;
      created_at: string;
      special_instructions: string | null;
      merchant_name: string;
      street: string;
      building: string;
      district: string | null;
      city: string;
    }>;
  };
  formatCurrency: (amount: number, currency: string) => string;
  formatDate: (value: string) => string;
}

export function DriverWorkspacePanel({
  data,
  formatCurrency,
  formatDate,
}: DriverWorkspacePanelProps) {
  const getAssignedOrderAction = (status: string) => {
    if (status === "picked_up") {
      return {
        action: completeDriverOrder,
        label: "Confirm delivery",
        note: "Trip in progress",
      };
    }

    if (status === "ready") {
      return {
        action: claimDriverOrder,
        label: "Start trip",
        note: "Assigned and ready to start",
      };
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="night-panel rounded-[1.55rem] p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
            Fleet
          </p>
          <h2 className="mt-3 text-xl font-semibold">Dispatch clarity</h2>
          <p className="mt-2 text-sm leading-6 text-white/70">
            Ready orders, assigned trips, and route state live in one mobile cockpit.
          </p>
        </article>
        <article className="night-panel rounded-[1.55rem] p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
            Reliability
          </p>
          <h2 className="mt-3 text-xl font-semibold">Less manual calling</h2>
          <p className="mt-2 text-sm leading-6 text-white/70">
            Merchant readiness and delivery notes stay attached to each assignment.
          </p>
        </article>
        <article className="night-panel rounded-[1.55rem] p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
            Motion
          </p>
          <h2 className="mt-3 text-xl font-semibold">Trip-first workflow</h2>
          <p className="mt-2 text-sm leading-6 text-white/70">
            Claim, start, and confirm delivery with as few taps as possible.
          </p>
        </article>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="night-panel rounded-[1.7rem] p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
            Driver mode
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            Dispatch and route execution
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/55">Vehicle</p>
              <p className="mt-2 text-xl font-semibold">{data.driver.vehicle_type}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/55">Availability</p>
              <p className="mt-2 text-xl font-semibold">{data.driver.availability}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <form action={updateDriverAvailability}>
              <input type="hidden" name="availability" value="available" />
              <Button type="submit">Go available</Button>
            </form>
            <form action={updateDriverAvailability}>
              <input type="hidden" name="availability" value="offline" />
              <Button type="submit" variant="secondary">
                Go offline
              </Button>
            </form>
          </div>

          <p className="mt-5 text-sm leading-6 text-white/72">
            The driver can now claim ready orders and close the trip after delivery.
          </p>
        </article>

        <article className="glass-panel rounded-[1.7rem] p-6">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Available ready orders
          </h2>
          <div className="mt-5 space-y-3">
            {data.availableOrders.length ? (
              data.availableOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-[1.5rem] border border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(245,239,231,0.86))] p-4 shadow-[0_18px_44px_-36px_rgba(28,25,23,0.3)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[var(--color-ink)]">{order.order_code}</p>
                      <p className="text-sm text-[var(--color-muted)]">{order.merchant_name}</p>
                    </div>
                    <StatusPill label={order.status} />
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-[var(--color-muted)]">
                    <p>{formatCurrency(order.total_amount, order.currency)}</p>
                    <p>{formatDate(order.created_at)}</p>
                    <p>
                      {order.street} {order.building}, {order.district ?? "District"}, {order.city}
                    </p>
                  </div>
                  <Link
                    href={`/workspace/orders/${order.id}`}
                    className="mt-4 inline-block text-sm font-medium text-[var(--color-accent-strong)] transition hover:opacity-80"
                  >
                    View details
                  </Link>
                  <form action={claimDriverOrder} className="mt-4">
                    <input type="hidden" name="orderId" value={order.id} />
                    <Button type="submit">Claim order</Button>
                  </form>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-sm text-[var(--color-muted)]">
                No ready orders are waiting right now.
              </div>
            )}
          </div>
        </article>
      </div>

      <article className="glass-panel rounded-[1.7rem] p-6">
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Assigned orders
        </h2>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {data.assignedOrders.length ? (
            data.assignedOrders.map((order) => {
              const orderAction = getAssignedOrderAction(order.status);

              return (
                <div
                  key={order.id}
                  className="rounded-[1.5rem] border border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(245,239,231,0.86))] p-4 shadow-[0_18px_44px_-36px_rgba(28,25,23,0.3)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[var(--color-ink)]">{order.order_code}</p>
                      <p className="text-sm text-[var(--color-muted)]">{order.merchant_name}</p>
                    </div>
                    <StatusPill label={order.status} />
                  </div>

                  <div className="mt-3 space-y-1 text-sm text-[var(--color-muted)]">
                    <p>{formatCurrency(order.total_amount, order.currency)}</p>
                    <p>{formatDate(order.created_at)}</p>
                    <p>
                      {order.street} {order.building}, {order.district ?? "District"}, {order.city}
                    </p>
                    <p>{order.special_instructions ?? "No delivery note"}</p>
                  </div>

                  <Link
                    href={`/workspace/orders/${order.id}`}
                    className="mt-4 inline-block text-sm font-medium text-[var(--color-accent-strong)] transition hover:opacity-80"
                  >
                    View details
                  </Link>

                  {orderAction ? (
                    <form action={orderAction.action} className="mt-4">
                      <input type="hidden" name="orderId" value={order.id} />
                      <Button type="submit">{orderAction.label}</Button>
                      <p className="mt-2 text-xs text-[var(--color-muted)]">{orderAction.note}</p>
                    </form>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-sm text-[var(--color-muted)]">
              No assigned orders yet.
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
