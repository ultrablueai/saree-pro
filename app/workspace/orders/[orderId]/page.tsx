import Link from "next/link";
import { notFound } from "next/navigation";
import {
  assignDriverToOrder,
  autoAssignDriverToOrder,
  openOrderDispute,
  resolveOrderDispute,
} from "@/app/workspace/order-detail-actions";
import { Button } from "@/components/Button";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { StatusPill } from "@/components/StatusPill";
import { requireSessionUser } from "@/lib/auth";
import { getRequestI18n } from "@/lib/i18n-server";
import { getOrderDetailsForSession } from "@/lib/order-details";

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

function getKindLabel(kind: string) {
  const labels: Record<string, string> = {
    order: "Order",
    payment: "Payment",
    delivery: "Delivery",
    dispute: "Dispute",
    finance: "Finance",
  };

  return labels[kind] ?? kind;
}

function getKindDotClass(kind: string) {
  const classes: Record<string, string> = {
    order: "bg-slate-500",
    payment: "bg-emerald-500",
    delivery: "bg-indigo-500",
    dispute: "bg-amber-500",
    finance: "bg-rose-500",
  };

  return classes[kind] ?? "bg-[var(--color-accent)]";
}

function DetailStat({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="metric-card">
      <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">{value}</p>
      {subtext ? <p className="mt-2 text-sm text-[var(--color-muted)]">{subtext}</p> : null}
    </div>
  );
}

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const session = await requireSessionUser();
  const { locale } = await getRequestI18n();
  const { orderId } = await params;
  const details = await getOrderDetailsForSession(session, orderId);

  if (!details) {
    notFound();
  }

  const openDisputes = details.disputes.filter((dispute) => dispute.status === "open");
  const resolvedDisputes = details.disputes.filter((dispute) => dispute.status === "resolved");
  const canOpenDispute =
    ["customer", "driver", "merchant"].includes(session.role) && openDisputes.length === 0;
  const canResolveDisputes = session.ownerAccess || session.role === "admin";
  const canManageAssignment = canResolveDisputes;
  const latestPayment = details.paymentTransactions[details.paymentTransactions.length - 1];
  const assignmentOpen = !["cancelled", "delivered", "picked_up"].includes(details.order.status);

  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-7xl px-4 pb-28 pt-5 sm:px-8 sm:pt-8">
      <div className="glass-panel rounded-[2rem] p-4 md:p-6">
        <header className="rounded-[1.8rem] bg-[radial-gradient(circle_at_top_left,rgba(214,107,66,0.15),transparent_34%),radial-gradient(circle_at_top_right,rgba(16,106,100,0.11),transparent_28%),linear-gradient(135deg,#fffaf4_0%,#f7efe5_52%,#f1e5d7_100%)] px-5 py-6 md:px-7 md:py-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link
                href="/workspace/orders"
                className="text-sm font-medium text-[var(--color-accent-strong)] transition hover:opacity-80"
              >
                Back to orders
              </Link>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
                {details.order.orderCode}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-muted)]">
                Full order timeline, address precision, financial state, and dispute review in one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill label={details.workflow.stageLabel} />
              <StatusPill label={details.workflow.paymentLabel} tone="warning" />
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DetailStat
              label="Current stage"
              value={details.workflow.stageLabel}
              subtext={`Step ${Math.max(details.workflow.stageIndex + 1, 1)} of 6`}
            />
            <DetailStat
              label="Payment state"
              value={details.workflow.paymentLabel}
              subtext={
                details.workflow.hasFinancialRelease
                  ? "Funds released"
                  : "Funds still controlled"
              }
            />
            <DetailStat
              label="Disputes"
              value={`${details.workflow.openDisputesCount} open`}
              subtext={`${details.workflow.resolvedDisputesCount} resolved`}
            />
            <DetailStat
              label="Latest payment"
              value={latestPayment ? latestPayment.status : details.order.paymentStatus}
              subtext={
                latestPayment
                  ? formatDate(latestPayment.createdAt, locale)
                  : "No payment transaction yet"
              }
            />
          </div>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="glass-panel rounded-[1.8rem] p-6">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              Order summary
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Customer</p>
                <p className="mt-2 font-semibold text-[var(--color-ink)]">{details.customer.name}</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{details.customer.email}</p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Merchant</p>
                <p className="mt-2 font-semibold text-[var(--color-ink)]">{details.merchant.name}</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  Driver:{" "}
                  {details.driver
                    ? `${details.driver.name} • ${details.driver.vehicleType}`
                    : "Unassigned"}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Subtotal</p>
                <p className="mt-2 font-semibold text-[var(--color-ink)]">
                  {formatCurrency(details.order.subtotalAmount, details.order.currency, locale)}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Delivery</p>
                <p className="mt-2 font-semibold text-[var(--color-ink)]">
                  {formatCurrency(details.order.deliveryFeeAmount, details.order.currency, locale)}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Total</p>
                <p className="mt-2 font-semibold text-[var(--color-ink)]">
                  {formatCurrency(details.order.totalAmount, details.order.currency, locale)}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Delivery address</p>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                {details.address.street} {details.address.building}
                {details.address.floor ? `, Floor ${details.address.floor}` : ""}
                {details.address.apartment ? `, Apt ${details.address.apartment}` : ""}
                , {details.address.district ?? "District"}, {details.address.city}
              </p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                {details.address.notes ?? "No delivery note"}
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Special instructions</p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                {details.order.specialInstructions ?? "No special instructions"}
              </p>
            </div>
          </article>

          <article className="glass-panel rounded-[1.8rem] p-6">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              Timeline
            </h2>
            <div className="mt-5 space-y-4">
              {details.timeline.map((entry) => (
                <div key={entry.key} className="flex gap-4">
                  <div className={`mt-1 h-3 w-3 shrink-0 rounded-full ${getKindDotClass(entry.kind)}`} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[var(--color-ink)]">{entry.label}</p>
                      <span className="rounded-full border border-[var(--color-border)] bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">
                        {getKindLabel(entry.kind)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">{entry.detail}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      {formatDate(entry.createdAt, locale)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <article className="glass-panel rounded-[1.8rem] p-6">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              Items
            </h2>
            <div className="mt-5 space-y-3">
              {details.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,239,230,0.84))] px-4 py-3 shadow-[0_16px_34px_-30px_rgba(28,25,23,0.28)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[var(--color-ink)]">{item.name}</p>
                      <p className="text-sm text-[var(--color-muted)]">Qty {item.quantity}</p>
                    </div>
                    <p className="font-semibold text-[var(--color-ink)]">
                      {formatCurrency(item.totalPriceAmount, details.order.currency, locale)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="glass-panel rounded-[1.8rem] p-6">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              Financial activity
            </h2>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Latest payment state</p>
                <p className="mt-2 font-semibold text-[var(--color-ink)]">
                  {latestPayment ? latestPayment.status : details.order.paymentStatus}
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {latestPayment
                    ? `${latestPayment.provider}${latestPayment.providerRef ? ` • ${latestPayment.providerRef}` : ""}`
                    : "No payment transaction yet"}
                </p>
              </div>

              {details.paymentTransactions.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-[var(--color-ink)]">{entry.status}</p>
                    <p className="font-semibold text-[var(--color-ink)]">
                      {formatCurrency(entry.amount, entry.currency, locale)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    {entry.provider} • {formatDate(entry.createdAt, locale)}
                  </p>
                </div>
              ))}

              {details.settlementEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-[var(--color-ink)]">{entry.entryType}</p>
                    <p className="font-semibold text-[var(--color-ink)]">
                      {formatCurrency(entry.amount, entry.currency, locale)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    {entry.partyType} • {entry.note ?? "No note"}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="glass-panel rounded-[1.8rem] p-6">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              Disputes
            </h2>

            <div className="mt-5 space-y-3">
              {openDisputes.length ? (
                openDisputes.map((dispute) => (
                  <div
                    key={dispute.id}
                    className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold text-[var(--color-ink)]">{dispute.reason}</p>
                      <StatusPill label={dispute.status} tone="warning" />
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-muted)]">
                      Opened by {dispute.openedByRole} • {formatDate(dispute.createdAt, locale)}
                    </p>
                    <p className="mt-2 text-sm text-[var(--color-muted)]">
                      {dispute.details ?? "No extra details"}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-sm text-[var(--color-muted)]">
                  No open disputes.
                </div>
              )}

              {resolvedDisputes.length ? (
                <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
                    Resolved disputes
                  </p>
                  <div className="mt-3 space-y-3">
                    {resolvedDisputes.map((dispute) => (
                      <div key={dispute.id} className="rounded-xl bg-[var(--color-surface)] px-3 py-2">
                        <p className="font-semibold text-[var(--color-ink)]">{dispute.reason}</p>
                        <p className="mt-1 text-sm text-[var(--color-muted)]">
                          {dispute.resolution ?? "resolved"} • {dispute.resolutionNote ?? "No note"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </article>

          <article className="glass-panel rounded-[1.8rem] p-6">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              Owner review
            </h2>
            {canManageAssignment ? (
              <div className="mt-5 rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="font-semibold text-[var(--color-ink)]">Driver assignment</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {details.driver
                    ? `Current assignment: ${details.driver.name} • ${details.driver.availability}`
                    : "No driver assigned yet."}
                </p>
                {details.recommendedDriver ? (
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    Dispatch recommendation: {details.recommendedDriver.name} •{" "}
                    {details.recommendedDriver.reason}
                  </p>
                ) : null}
                {assignmentOpen && details.availableDrivers.length ? (
                  <div className="mt-4 space-y-4">
                    <form action={assignDriverToOrder} className="space-y-4">
                      <input type="hidden" name="orderId" value={details.order.id} />
                      <select
                        name="driverId"
                        defaultValue={details.driver?.id ?? details.availableDrivers[0]?.id}
                        className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)]"
                      >
                        {details.availableDrivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.name} • {driver.vehicleType} • {driver.availability} •{" "}
                            {driver.activeOrderCount} active
                          </option>
                        ))}
                      </select>
                      <Button type="submit">Assign driver</Button>
                    </form>
                    {details.recommendedDriver ? (
                      <form action={autoAssignDriverToOrder}>
                        <input type="hidden" name="orderId" value={details.order.id} />
                        <Button type="submit" variant="secondary">
                          Auto assign best fit
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-[var(--color-border)] bg-white px-4 py-4 text-sm text-[var(--color-muted)]">
                    {assignmentOpen
                      ? "No verified drivers available for assignment."
                      : "Driver assignment is locked after pickup, cancellation, or delivery."}
                  </div>
                )}
              </div>
            ) : null}

            {canResolveDisputes && openDisputes.length ? (
              <div className="mt-5 space-y-4">
                {openDisputes.map((dispute) => (
                  <form
                    key={dispute.id}
                    action={resolveOrderDispute}
                    className="space-y-4 rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                  >
                    <input type="hidden" name="disputeId" value={dispute.id} />
                    <div>
                      <p className="font-semibold text-[var(--color-ink)]">{dispute.reason}</p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {dispute.details ?? "No extra details"}
                      </p>
                    </div>
                    <select
                      name="resolution"
                      defaultValue="dismiss"
                      className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)]"
                    >
                      <option value="dismiss">Dismiss dispute</option>
                      <option value="refund_customer">Refund customer</option>
                      <option value="release_funds">Release funds</option>
                    </select>
                    <textarea
                      name="resolutionNote"
                      placeholder="Owner resolution note"
                      className="min-h-24 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)]"
                    />
                    <Button type="submit">Resolve dispute</Button>
                  </form>
                ))}
              </div>
            ) : canOpenDispute ? (
              <form action={openOrderDispute} className="mt-5 space-y-4">
                <input type="hidden" name="orderId" value={details.order.id} />
                <input
                  type="text"
                  name="reason"
                  placeholder="Short dispute reason"
                  className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)]"
                  required
                />
                <textarea
                  name="details"
                  placeholder="Describe what happened"
                  className="min-h-28 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)]"
                />
                <Button type="submit">Submit dispute</Button>
              </form>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-sm text-[var(--color-muted)]">
                {canResolveDisputes
                  ? "No open disputes need owner action for this order."
                  : openDisputes.length
                    ? "There is already an open dispute for this order."
                    : "This account cannot open or resolve disputes for this order."}
              </div>
            )}
          </article>
        </section>
      </div>

      <MobileBottomNav showOwner={session.ownerAccess || session.role === "admin"} />
    </main>
  );
}
