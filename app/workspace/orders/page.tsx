import Link from "next/link";
import {
  assignDriverToOrder,
  autoAssignDriverToOrder,
  resolveOrderDispute,
} from "@/app/workspace/order-detail-actions";
import { Button } from "@/components/Button";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { requireSessionUser } from "@/lib/auth";
import { getRequestI18n } from "@/lib/i18n-server";
import { getOrderListForSession } from "@/lib/order-list";

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCurrency(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount / 100);
}

export default async function OrdersIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; dispute?: string; assignment?: string }>;
}) {
  const session = await requireSessionUser();
  const { locale } = await getRequestI18n();
  const filters = await searchParams;
  const data = await getOrderListForSession(session, filters);
  const canResolveDisputes = session.ownerAccess || session.role === "admin";
  const canAssignDrivers = canResolveDisputes;

  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-7xl px-4 pb-28 pt-5 sm:px-8 sm:pt-8">
      <div className="glass-panel rounded-[2rem] p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border)] pb-8">
          <div>
            <Link
              href="/workspace"
              className="text-sm font-medium text-[var(--color-accent-strong)] transition hover:opacity-80"
            >
              Back to workspace
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
              Orders hub
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-muted)]">
              Unified order list for operations, driver assignment, dispute review, and order
              detail navigation.
            </p>
          </div>

          <div className="grid min-w-72 gap-3 sm:grid-cols-5">
            <div className="rounded-[1.25rem] border border-[var(--color-border)] bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Total</p>
              <p className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
                {data.totals.totalOrders}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-[var(--color-border)] bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Open</p>
              <p className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
                {data.totals.openOrders}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-[var(--color-border)] bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
                Disputed
              </p>
              <p className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
                {data.totals.disputedOrders}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-[var(--color-border)] bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
                Unassigned
              </p>
              <p className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
                {data.totals.unassignedOrders}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-[var(--color-border)] bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Ready</p>
              <p className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
                {data.totals.readyForPickupOrders}
              </p>
            </div>
          </div>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
          <label className="space-y-2 text-sm font-medium text-[var(--color-ink)]">
            Status
            <select
              name="status"
              defaultValue={data.filters.status}
              className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-accent)]"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="picked_up">Picked up</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-[var(--color-ink)]">
            Dispute
            <select
              name="dispute"
              defaultValue={data.filters.dispute}
              className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-accent)]"
            >
              <option value="all">All dispute states</option>
              <option value="open">Open dispute</option>
              <option value="resolved">Resolved dispute</option>
              <option value="none">No dispute</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-[var(--color-ink)]">
            Assignment
            <select
              name="assignment"
              defaultValue={data.filters.assignment}
              className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-accent)]"
            >
              <option value="all">All assignment states</option>
              <option value="unassigned">Unassigned</option>
              <option value="assigned">Assigned</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--color-accent)] px-6 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Apply filters
            </button>
          </div>
        </form>

        <div className="mt-6 space-y-4">
          {data.items.length ? (
            data.items.map((order) => (
              <div
                key={order.id}
                className="rounded-[1.5rem] border border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(247,239,230,0.86))] p-5 shadow-[0_18px_40px_-34px_rgba(28,25,23,0.3)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[var(--color-ink)]">{order.orderCode}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      {order.customerName} - {order.merchantName}
                      {order.driverName ? ` - ${order.driverName}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
                    {order.dispatchPriority === "dispatch_now" ? (
                      <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-800">
                        dispatch now
                      </span>
                    ) : null}
                    {order.dispatchPriority === "watch" ? (
                      <span className="rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-sky-800">
                        watch assignment
                      </span>
                    ) : null}
                    <span className="rounded-full border border-[var(--color-border)] px-3 py-1">
                      {order.status}
                    </span>
                    <span className="rounded-full border border-[var(--color-border)] px-3 py-1">
                      {order.paymentStatus}
                    </span>
                    {order.disputeStatus ? (
                      <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-amber-900">
                        {order.disputeStatus}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--color-muted)]">
                  <p>{formatCurrency(order.totalAmount, order.currency, locale)}</p>
                  <p>{formatDate(order.createdAt, locale)}</p>
                  {order.recommendedDriverName ? <p>Suggested driver: {order.recommendedDriverName}</p> : null}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/workspace/orders/${order.id}`}
                    className="inline-block text-sm font-medium text-[var(--color-accent-strong)] transition hover:opacity-80"
                  >
                    Open order details
                  </Link>

                  {canAssignDrivers &&
                  !["cancelled", "delivered", "picked_up"].includes(order.status) &&
                  data.availableDrivers.length ? (
                    <form action={assignDriverToOrder} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="orderId" value={order.id} />
                      <select
                        name="driverId"
                        defaultValue={order.driverId ?? data.availableDrivers[0]?.id}
                        className="rounded-full border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)]"
                      >
                        {data.availableDrivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.name} - {driver.availability} - {driver.activeOrderCount} active
                          </option>
                        ))}
                      </select>
                      <Button type="submit" variant="ghost">
                        {order.driverId ? "Reassign" : "Assign"}
                      </Button>
                    </form>
                  ) : null}

                  {canAssignDrivers &&
                  !order.driverId &&
                  !["cancelled", "delivered", "picked_up"].includes(order.status) &&
                  order.recommendedDriverId ? (
                    <form action={autoAssignDriverToOrder}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <Button type="submit" variant="secondary">
                        Auto assign best fit
                      </Button>
                    </form>
                  ) : null}

                  {canResolveDisputes && order.disputeStatus === "open" && order.disputeId ? (
                    <>
                      <form action={resolveOrderDispute}>
                        <input type="hidden" name="disputeId" value={order.disputeId} />
                        <input type="hidden" name="resolution" value="dismiss" />
                        <Button type="submit" variant="ghost">
                          Dismiss
                        </Button>
                      </form>
                      <form action={resolveOrderDispute}>
                        <input type="hidden" name="disputeId" value={order.disputeId} />
                        <input type="hidden" name="resolution" value="refund_customer" />
                        <Button type="submit" variant="secondary">
                          Refund
                        </Button>
                      </form>
                      <form action={resolveOrderDispute}>
                        <input type="hidden" name="disputeId" value={order.disputeId} />
                        <input type="hidden" name="resolution" value="release_funds" />
                        <Button type="submit">Release funds</Button>
                      </form>
                    </>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/70 px-4 py-8 text-sm text-[var(--color-muted)]">
              No orders matched these filters.
            </div>
          )}
        </div>
      </div>
      <MobileBottomNav showOwner={session.ownerAccess || session.role === "admin"} />
    </main>
  );
}
