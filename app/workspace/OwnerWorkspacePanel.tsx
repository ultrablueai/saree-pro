import Link from "next/link";

interface OwnerWorkspacePanelProps {
  data: {
    metrics: {
      grossSales: string;
      platformFees: string;
      heldEscrow: string;
      releasedFunds: string;
      merchantPayouts: string;
      driverPayouts: string;
      refundedAmount: string;
      pendingOrders: number;
      activeDrivers: number;
      operationalOrders: number;
      highPriorityAlerts: number;
      criticalAlerts: number;
    };
    operationalOrders: Array<{
      id: string;
      order_code: string;
      status: string;
      payment_status: string;
      total_amount: number;
      currency: string;
      created_at: string;
      customer_name: string;
      merchant_name: string;
      driver_name: string;
      driver_assigned: number;
      age_minutes: number;
      alert_severity: "normal" | "medium" | "high" | "critical";
      alert_label: string;
      alert_detail: string;
    }>;
    attentionAlerts: Array<{
      order_id: string;
      order_code: string;
      severity: "medium" | "high" | "critical";
      label: string;
      detail: string;
      age_minutes: number;
      status: string;
    }>;
    paymentLedger: Array<{
      created_at: string;
      status: string;
      amount: number;
      currency: string;
      provider: string;
      order_code: string;
    }>;
    settlementLedger: Array<{
      created_at: string;
      entry_type: string;
      party_type: string;
      amount: number;
      currency: string;
      note: string | null;
      order_code: string;
    }>;
    openDisputes: Array<{
      id: string;
      order_id: string;
      reason: string;
      status: string;
      created_at: string;
      order_code: string;
    }>;
    auditLogs: Array<{
      created_at: string;
      action: string;
      entity_type: string;
      entity_id: string | null;
    }>;
  };
  formatDate: (value: string) => string;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

function statusLabel(status: string) {
  if (status === "pending" || status === "confirmed") {
    return "attention";
  }

  if (status === "preparing" || status === "ready") {
    return "processing";
  }

  if (status === "picked_up") {
    return "in transit";
  }

  return status;
}

function alertToneClasses(severity: "normal" | "medium" | "high" | "critical") {
  if (severity === "critical") {
    return "border-rose-300 bg-rose-50 text-rose-800";
  }

  if (severity === "high") {
    return "border-amber-300 bg-amber-50 text-amber-800";
  }

  if (severity === "medium") {
    return "border-sky-300 bg-sky-50 text-sky-800";
  }

  return "border-[var(--color-border)] bg-white text-[var(--color-muted)]";
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">{value}</p>
    </div>
  );
}

export function OwnerWorkspacePanel({ data, formatDate }: OwnerWorkspacePanelProps) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="metric-card">
          <p className="section-kicker">Control</p>
          <h2 className="mt-3 text-xl font-semibold text-[var(--color-ink)]">
            Owner operations center
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
            Platform health, finance, alerts, and dispute action stay aligned in one place.
          </p>
        </article>
        <article className="metric-card">
          <p className="section-kicker">Risk</p>
          <h2 className="mt-3 text-xl font-semibold text-[var(--color-ink)]">
            Escalation visibility
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
            Aged, unassigned, delayed, and disputed orders rise to the top immediately.
          </p>
        </article>
        <article className="metric-card">
          <p className="section-kicker">Cash</p>
          <h2 className="mt-3 text-xl font-semibold text-[var(--color-ink)]">
            Unified financial trail
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
            Held funds, releases, payouts, and refunds remain visible to operations and finance.
          </p>
        </article>
      </section>

      <div className="glass-panel rounded-[1.8rem] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="section-kicker">Operations center</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              Live owner control room
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-muted)]">
              This view keeps the owner focused on active orders, dispute resolution, and cash
              flow without leaving the same dashboard.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="#ops"
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-white"
            >
              Operations
            </Link>
            <Link
              href="#money"
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-white"
            >
              Money
            </Link>
            <Link
              href="#disputes"
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-white"
            >
              Disputes
            </Link>
            <Link
              href="/workspace/access"
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-white"
            >
              Access
            </Link>
            <Link
              href="/workspace/disputes"
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-white"
            >
              Disputes
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Gross sales" value={data.metrics.grossSales} />
        <MetricCard label="Platform fees" value={data.metrics.platformFees} />
        <MetricCard label="Held escrow" value={data.metrics.heldEscrow} />
        <MetricCard label="Released funds" value={data.metrics.releasedFunds} />
        <MetricCard label="Pending orders" value={data.metrics.pendingOrders.toString()} />
        <MetricCard label="Active drivers" value={data.metrics.activeDrivers.toString()} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Merchant payouts" value={data.metrics.merchantPayouts} />
        <MetricCard label="Driver payouts" value={data.metrics.driverPayouts} />
        <MetricCard label="Refunded amount" value={data.metrics.refundedAmount} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          label="High priority alerts"
          value={data.metrics.highPriorityAlerts.toString()}
        />
        <MetricCard label="Critical alerts" value={data.metrics.criticalAlerts.toString()} />
      </div>

      <section className="glass-panel rounded-[1.8rem] p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              Intervention queue
            </h3>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              These alerts combine order age, readiness, and assignment gaps into one owner queue.
            </p>
          </div>
          <Link
            href="/workspace/orders?assignment=unassigned"
            className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-white"
          >
            Open unassigned orders
          </Link>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {data.attentionAlerts.length ? (
            data.attentionAlerts.map((alert) => (
              <div
                key={`${alert.order_id}-${alert.label}`}
                className={`rounded-[1.5rem] border p-4 ${alertToneClasses(alert.severity)}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{alert.order_code}</p>
                    <p className="mt-1 text-sm">{alert.label}</p>
                  </div>
                  <div className="rounded-full border border-current/20 bg-white/60 px-3 py-1 text-xs uppercase tracking-[0.2em]">
                    {alert.severity}
                  </div>
                </div>
                <p className="mt-3 text-sm">{alert.detail}</p>
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <p>{alert.status}</p>
                  <p>{alert.age_minutes} min old</p>
                </div>
                <Link
                  href={`/workspace/orders/${alert.order_id}`}
                  className="mt-4 inline-block text-sm font-medium text-[var(--color-accent-strong)] transition hover:opacity-80"
                >
                  Open order details
                </Link>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-sm text-[var(--color-muted)]">
              No active intervention alerts right now.
            </div>
          )}
        </div>
      </section>

      <section id="ops" className="glass-panel rounded-[1.8rem] p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              Operational queue
            </h3>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              {data.metrics.operationalOrders} active orders across the platform.
            </p>
          </div>
          <div className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-muted)]">
            Attention to Processing to Transit
          </div>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {data.operationalOrders.length ? (
            data.operationalOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-[1.5rem] border border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,239,230,0.85))] p-4 shadow-[0_18px_40px_-34px_rgba(28,25,23,0.3)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--color-ink)]">{order.order_code}</p>
                    <p className="text-sm text-[var(--color-muted)]">
                      {order.customer_name} to {order.merchant_name}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
                      {statusLabel(order.status)}
                    </div>
                    <div
                      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${alertToneClasses(order.alert_severity)}`}
                    >
                      {order.alert_label}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--color-muted)]">
                  <p>{formatCurrency(order.total_amount, order.currency)}</p>
                  <p>{order.payment_status}</p>
                  <p>{order.driver_name}</p>
                  <p>{order.age_minutes} min old</p>
                  <p>{formatDate(order.created_at)}</p>
                </div>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{order.alert_detail}</p>
                <Link
                  href={`/workspace/orders/${order.id}`}
                  className="mt-4 inline-block text-sm font-medium text-[var(--color-accent-strong)] transition hover:opacity-80"
                >
                  Open order details
                </Link>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-sm text-[var(--color-muted)]">
              No active operational orders.
            </div>
          )}
        </div>
      </section>

      <section
        id="disputes"
        className="glass-panel grid gap-6 rounded-[1.8rem] p-6 lg:grid-cols-[1fr_1fr]"
      >
        <div>
          <h3 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Open disputes
          </h3>
          <div className="mt-5 space-y-3">
            {data.openDisputes.length ? (
              data.openDisputes.map((dispute) => (
                <div
                  key={dispute.id}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-[var(--color-ink)]">{dispute.order_code}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
                      {dispute.status}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">{dispute.reason}</p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {formatDate(dispute.created_at)}
                  </p>
                  <Link
                    href={`/workspace/orders/${dispute.order_id}`}
                    className="mt-3 inline-block text-sm font-medium text-[var(--color-accent-strong)] transition hover:opacity-80"
                  >
                    Review dispute
                  </Link>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-sm text-[var(--color-muted)]">
                No open disputes.
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Decision path
          </h3>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Use the order details page to release funds, refund the customer, or dismiss a dispute.
          </p>
          <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-muted)]">
            Refunds and releases now flow into the settlement ledger so finance and operations see
            the same result.
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div id="money" className="glass-panel rounded-[1.8rem] p-6">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Payment ledger
          </h2>
          <div className="mt-5 space-y-3">
            {data.paymentLedger.length ? (
              data.paymentLedger.map((entry) => (
                <div
                  key={`${entry.order_code}-${entry.created_at}-${entry.status}`}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-[var(--color-ink)]">{entry.order_code}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
                      {entry.status}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    {formatCurrency(entry.amount, entry.currency)} • {entry.provider}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {formatDate(entry.created_at)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-sm text-[var(--color-muted)]">
                No payment transactions yet.
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel rounded-[1.8rem] p-6">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Settlement ledger
          </h2>
          <div className="mt-5 space-y-3">
            {data.settlementLedger.length ? (
              data.settlementLedger.map((entry) => (
                <div
                  key={`${entry.order_code}-${entry.created_at}-${entry.entry_type}`}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-[var(--color-ink)]">{entry.order_code}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
                      {entry.entry_type}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    {entry.party_type} • {formatCurrency(entry.amount, entry.currency)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {entry.note ?? "No note"} • {formatDate(entry.created_at)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-sm text-[var(--color-muted)]">
                No settlement entries yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-[1.8rem] p-6">
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Owner audit trail
        </h2>
        <div className="mt-5 space-y-3">
          {data.auditLogs.map((entry) => (
            <div
              key={`${entry.created_at}-${entry.action}`}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold text-[var(--color-ink)]">{entry.action}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
                  {entry.entity_type}
                </p>
              </div>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                {(entry.entity_id ?? "system").toString()} • {formatDate(entry.created_at)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
