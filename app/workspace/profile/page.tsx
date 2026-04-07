import Link from "next/link";
import { markProfileNotificationRead, markProfileNotificationsRead } from "@/app/workspace/profile/actions";
import { Button } from "@/components/Button";
import { StatusPill } from "@/components/StatusPill";
import { requireSessionUser } from "@/lib/auth";
import { getNotificationsByUserId, getUnreadCount } from "@/lib/notifications";
import { getCustomerOrders, getUserAddressSummary } from "@/lib/workspace-data";

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default async function ProfilePage() {
  const session = await requireSessionUser();
  const [address, notifications, unreadCount, orders] = await Promise.all([
    getUserAddressSummary(session.id),
    getNotificationsByUserId(session.id, 12),
    getUnreadCount(session.id),
    session.role === "customer" ? getCustomerOrders(session.id) : Promise.resolve([]),
  ]);

  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-6xl px-4 pb-20 pt-5 sm:px-8 sm:pt-8">
      <div className="glass-panel overflow-hidden rounded-[2rem] p-4 md:p-6">
        <header className="rounded-[1.8rem] bg-[radial-gradient(circle_at_top_left,rgba(214,107,66,0.14),transparent_32%),linear-gradient(135deg,#fffaf4_0%,#f7efe5_52%,#f1e5d7_100%)] px-6 py-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="space-y-4">
              <StatusPill
                label={session.ownerAccess ? "Elevated owner session" : "Authenticated session"}
                tone={session.ownerAccess ? "warning" : "success"}
              />
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.28em] text-[var(--color-muted)]">
                  Account
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
                  {session.name}
                </h1>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-[var(--color-muted)]">
                This profile now reflects the live session, recent activity, saved address, and the
                notification feed used by the workspace.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/workspace">
                <Button variant="secondary">Back to workspace</Button>
              </Link>
              <Link href="/workspace/orders">
                <Button variant="ghost">Orders hub</Button>
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <article className="metric-card">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Name</p>
            <p className="mt-3 text-xl font-semibold text-[var(--color-ink)]">{session.name}</p>
          </article>
          <article className="metric-card">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Email</p>
            <p className="mt-3 break-all text-sm font-medium text-[var(--color-ink)]">
              {session.email}
            </p>
          </article>
          <article className="metric-card">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Role</p>
            <p className="mt-3 text-xl font-semibold text-[var(--color-ink)]">
              {formatRole(session.role)}
            </p>
          </article>
          <article className="metric-card">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
              Access scope
            </p>
            <p className="mt-3 text-xl font-semibold text-[var(--color-ink)]">
              {session.ownerAccess ? "Owner access" : "Standard"}
            </p>
          </article>
          <article className="metric-card">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
              Unread alerts
            </p>
            <p className="mt-3 text-xl font-semibold text-[var(--color-ink)]">{unreadCount}</p>
          </article>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[1.6rem] border border-[var(--color-border)] bg-white/75 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-accent-strong)]">
              Delivery Profile
            </p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--color-muted)]">
              {address ? (
                <>
                  <p>
                    <span className="font-semibold text-[var(--color-ink)]">Address:</span>{" "}
                    {address.label ?? "Primary address"}
                  </p>
                  <p>
                    {address.street} {address.building}, {address.district ?? "District"},{" "}
                    {address.city}
                  </p>
                  <p>{address.notes ?? "No delivery note saved."}</p>
                </>
              ) : (
                <p>No saved address found yet.</p>
              )}
            </div>

            {orders.length ? (
              <div className="mt-6 rounded-[1.4rem] border border-[var(--color-border)] bg-[var(--color-surface-strong)]/55 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                  Latest customer order
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
                  {orders[0]?.order_code}
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {orders[0]?.merchant_name} • {orders[0]?.status}
                </p>
              </div>
            ) : null}
          </article>

          <article className="rounded-[1.6rem] border border-[var(--color-border)] bg-[var(--color-surface-strong)]/55 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
                  Notification Feed
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                  Real alerts now come from the database and stay in sync with the workspace.
                </p>
              </div>
              {unreadCount > 0 ? (
                <form action={markProfileNotificationsRead}>
                  <Button type="submit" variant="secondary">
                    Mark all read
                  </Button>
                </form>
              ) : null}
            </div>

            <div className="mt-5 space-y-3">
              {notifications.length ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="rounded-[1.35rem] border border-[var(--color-border)] bg-white/80 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[var(--color-ink)]">
                            {notification.title}
                          </p>
                          {!notification.isRead ? (
                            <span className="rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-strong)]">
                              New
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                          {notification.message}
                        </p>
                        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                          {notification.type} • {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {notification.link ? (
                          <Link href={notification.link}>
                            <Button variant="ghost">Open</Button>
                          </Link>
                        ) : null}
                        {!notification.isRead ? (
                          <form action={markProfileNotificationRead}>
                            <input type="hidden" name="notificationId" value={notification.id} />
                            <Button type="submit" variant="secondary">
                              Read
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/80 px-4 py-6 text-sm text-[var(--color-muted)]">
                  No notifications yet.
                </div>
              )}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
