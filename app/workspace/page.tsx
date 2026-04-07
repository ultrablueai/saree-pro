import Link from "next/link";
import { CustomerWorkspacePanel } from "@/app/workspace/CustomerWorkspacePanel";
import { DriverWorkspacePanel } from "@/app/workspace/DriverWorkspacePanel";
import { signOutWorkspace } from "@/app/workspace/actions";
import { MerchantWorkspacePanel } from "@/app/workspace/MerchantWorkspacePanel";
import { OwnerWorkspacePanel } from "@/app/workspace/OwnerWorkspacePanel";
import { Button } from "@/components/Button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import NotificationBell from "@/components/NotificationBell";
import { StatusPill } from "@/components/StatusPill";
import { requireSessionUser } from "@/lib/auth";
import { getRequestI18n } from "@/lib/i18n-server";
import { getNotificationsByUserId, getUnreadCount } from "@/lib/notifications";
import { getWorkspaceSummary } from "@/lib/workspace-data";

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

function getRoleTheme(type: "customer" | "merchant" | "driver" | "owner" | "admin") {
  if (type === "driver") {
    return {
      shell: "night-panel text-white",
      hero:
        "bg-[radial-gradient(circle_at_top_left,rgba(53,168,151,0.28),transparent_32%),linear-gradient(135deg,#12161d_0%,#16202b_50%,#0f141b_100%)] text-white",
      subtext: "text-white/72",
      chip: "border-white/10 bg-white/10 text-white/82",
    };
  }

  if (type === "owner" || type === "admin") {
    return {
      shell: "glass-panel",
      hero:
        "bg-[radial-gradient(circle_at_top_left,rgba(16,106,100,0.16),transparent_32%),linear-gradient(135deg,#fff8f2_0%,#f7efe6_52%,#f3e6da_100%)]",
      subtext: "text-[var(--color-muted)]",
      chip: "border-[var(--color-border)] bg-white/80 text-[var(--color-ink)]",
    };
  }

  return {
    shell: "glass-panel",
    hero:
      "bg-[radial-gradient(circle_at_top_left,rgba(214,107,66,0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(16,106,100,0.1),transparent_30%),linear-gradient(135deg,#fffaf4_0%,#f7efe5_52%,#f1e5d7_100%)]",
    subtext: "text-[var(--color-muted)]",
    chip: "border-[var(--color-border)] bg-white/80 text-[var(--color-ink)]",
  };
}

function getWorkspaceHighlights(
  workspace: Awaited<ReturnType<typeof getWorkspaceSummary>>,
  locale: string,
) {
  if (workspace.type === "customer") {
    return [
      { label: "Recent orders", value: workspace.data.orders.length.toString() },
      {
        label: "Wallet balance",
        value: workspace.data.wallet
          ? formatCurrency(Math.round(workspace.data.wallet.balance * 100), workspace.data.wallet.currency, locale)
          : "Not ready",
      },
      {
        label: "Loyalty points",
        value: workspace.data.loyaltyPoints
          ? workspace.data.loyaltyPoints.points.toString()
          : workspace.data.unreadNotifications.toString(),
      },
    ];
  }

  if (workspace.type === "merchant" && workspace.data) {
    return [
      { label: "Store status", value: workspace.data.merchant.status },
      { label: "Kitchen queue", value: workspace.data.activeOrders.toString() },
      {
        label: "Minimum order",
        value: formatCurrency(
          workspace.data.merchant.minimum_order_amount,
          workspace.data.merchant.currency,
          locale,
        ),
      },
    ];
  }

  if (workspace.type === "driver" && workspace.data) {
    return [
      { label: "Availability", value: workspace.data.driver.availability },
      { label: "Assigned", value: workspace.data.assignedOrders.length.toString() },
      { label: "Ready nearby", value: workspace.data.availableOrders.length.toString() },
    ];
  }

  if ((workspace.type === "owner" || workspace.type === "admin") && workspace.data) {
    return [
      { label: "Pending orders", value: workspace.data.metrics.pendingOrders.toString() },
      { label: "Active drivers", value: workspace.data.metrics.activeDrivers.toString() },
      { label: "Critical alerts", value: workspace.data.metrics.criticalAlerts.toString() },
    ];
  }

  return [];
}

export default async function WorkspacePage() {
  const session = await requireSessionUser();
  const { locale, dictionary } = await getRequestI18n();
  const [workspace, headerNotifications, headerUnreadCount] = await Promise.all([
    getWorkspaceSummary(session),
    getNotificationsByUserId(session.id, 6),
    getUnreadCount(session.id),
  ]);
  const workspaceLabel =
    session.ownerAccess
      ? dictionary.workspaces.ownerAccess
      : dictionary.workspaces[workspace.type];
  const theme = getRoleTheme(workspace.type);
  const highlights = getWorkspaceHighlights(workspace, locale);

  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-7xl px-4 pb-28 pt-5 sm:px-8 sm:pt-8">
      <div className={`overflow-hidden rounded-[2rem] p-4 md:p-6 ${theme.shell}`}>
        <header className={`rounded-[1.8rem] border border-transparent px-5 py-6 md:px-7 md:py-7 ${theme.hero}`}>
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="space-y-4">
              <StatusPill
                label={workspaceLabel}
                tone={session.ownerAccess ? "warning" : "success"}
              />
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-[var(--color-muted)]">
                  Saree Pro
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                  {dictionary.common.welcome}, {session.name}
                </h1>
              </div>
              <p className={`max-w-3xl text-base leading-7 ${theme.subtext}`}>
                {dictionary.workspaces.workspaceIntro}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 md:max-w-sm md:justify-end">
              <Link href="/workspace/orders">
                <Button variant="ghost" className="bg-white/75">
                  Orders hub
                </Button>
              </Link>
              {workspace.type === "customer" ? (
                <Link href="/workspace/wallet">
                  <Button variant="ghost" className="bg-white/75">
                    Wallet
                  </Button>
                </Link>
              ) : null}
              <NotificationBell
                notifications={headerNotifications}
                unreadCount={headerUnreadCount}
              />
              <LanguageSwitcher currentLocale={locale} label={dictionary.common.language} />
              <form action={signOutWorkspace}>
                <Button type="submit" variant="secondary">
                  {dictionary.nav.signOut}
                </Button>
              </form>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {highlights.map((highlight) => (
              <div
                key={highlight.label}
                className={`rounded-[1.3rem] border px-4 py-4 ${theme.chip}`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] opacity-70">
                  {highlight.label}
                </p>
                <p className="mt-2 text-xl font-semibold">{highlight.value}</p>
              </div>
            ))}
          </div>
        </header>

        <section className="mt-5">
          {workspace.type === "customer" ? (
            <CustomerWorkspacePanel
              data={workspace.data}
              formatCurrency={(amount, currency) => formatCurrency(amount, currency, locale)}
              formatDate={(value) => formatDate(value, locale)}
            />
          ) : null}

          {workspace.type === "merchant" && workspace.data ? (
            <MerchantWorkspacePanel
              data={workspace.data}
              formatCurrency={(amount, currency) => formatCurrency(amount, currency, locale)}
              formatDate={(value) => formatDate(value, locale)}
            />
          ) : null}

          {workspace.type === "driver" && workspace.data ? (
            <DriverWorkspacePanel
              data={workspace.data}
              formatCurrency={(amount, currency) => formatCurrency(amount, currency, locale)}
              formatDate={(value) => formatDate(value, locale)}
            />
          ) : null}

          {(workspace.type === "owner" || workspace.type === "admin") && workspace.data ? (
            <OwnerWorkspacePanel
              data={workspace.data}
              formatDate={(value) => formatDate(value, locale)}
            />
          ) : null}
        </section>
      </div>

      <MobileBottomNav showOwner={session.ownerAccess || session.role === "admin"} />
    </main>
  );
}
