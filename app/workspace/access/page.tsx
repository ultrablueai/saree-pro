import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/Button";
import RoleManager from "@/components/RBAC/RoleManager";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { requireSessionUser } from "@/lib/auth";
import { listAccessUsers } from "@/lib/rbac-server";

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const session = await requireSessionUser();
  if (!session.ownerAccess && session.role !== "admin") {
    redirect("/workspace");
  }

  const users = await listAccessUsers();
  const params = await searchParams;
  const selectedUserId =
    users.find((user) => user.id === params.user)?.id ?? users[0]?.id ?? session.id;
  const selectedUser = users.find((user) => user.id === selectedUserId);

  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-7xl px-4 pb-28 pt-5 sm:px-8 sm:pt-8">
      <div className="glass-panel overflow-hidden rounded-[2rem] p-4 md:p-6">
        <header className="rounded-[1.8rem] bg-[radial-gradient(circle_at_top_left,rgba(16,106,100,0.16),transparent_34%),linear-gradient(135deg,#fff8f2_0%,#f7efe6_52%,#f3e6da_100%)] px-5 py-6 md:px-7 md:py-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-[var(--color-muted)]">
                Saree Pro
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Access overview
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--color-muted)]">
                Read-only role inspection for the users currently present in the workspace data
                layer.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/workspace">
                <Button variant="ghost" className="bg-white/75">
                  Back to workspace
                </Button>
              </Link>
              <Link href="/workspace/orders">
                <Button variant="secondary">Open orders hub</Button>
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-6 lg:grid-cols-[0.36fr_0.64fr]">
          <div className="glass-panel rounded-[1.7rem] p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
              Workspace users
            </p>
            <div className="mt-4 space-y-3">
              {users.map((user) => {
                const isActive = user.id === selectedUserId;

                return (
                  <Link
                    key={user.id}
                    href={`/workspace/access?user=${encodeURIComponent(user.id)}`}
                    className={`block rounded-[1.35rem] border px-4 py-4 transition ${
                      isActive
                        ? "border-[var(--color-accent)] bg-white shadow-sm"
                        : "border-[var(--color-border)] bg-white/80 hover:-translate-y-0.5"
                    }`}
                  >
                    <p className="font-semibold text-[var(--color-ink)]">{user.fullName}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">{user.email}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                      {user.role}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>

          {selectedUser ? (
            <RoleManager
              userId={selectedUser.id}
              userLabel={`${selectedUser.fullName} · ${selectedUser.email}`}
            />
          ) : (
            <div className="glass-panel rounded-[1.7rem] p-6 text-sm text-[var(--color-muted)]">
              No users available for access inspection yet.
            </div>
          )}
        </section>
      </div>

      <MobileBottomNav showOwner />
    </main>
  );
}
