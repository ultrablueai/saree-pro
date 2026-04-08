import Link from "next/link";
import { DisputeCenter } from "@/components/Dispute/DisputeCenter";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { requireSessionUser } from "@/lib/auth";

export default async function DisputesPage() {
  const session = await requireSessionUser();
  const role = session.ownerAccess
    ? "owner"
    : session.role === "admin"
      ? "admin"
      : session.role;

  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-7xl px-4 pb-28 pt-5 sm:px-8 sm:pt-8">
      <div className="glass-panel rounded-[2rem] p-4 md:p-6">
        <div className="border-b border-[var(--color-border)] pb-8">
          <Link
            href="/workspace"
            className="text-sm font-medium text-[var(--color-accent-strong)] transition hover:opacity-80"
          >
            Back to workspace
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            Disputes
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-muted)]">
            Read-only dispute visibility for open and resolved order issues across the workspace.
          </p>
        </div>

        <DisputeCenter className="mt-6" userId={session.id} role={role} />
      </div>

      <MobileBottomNav showOwner={session.ownerAccess || session.role === "admin"} />
    </main>
  );
}
