import Link from "next/link";
import WalletDashboard from "@/components/Wallet/WalletDashboard";
import { Button } from "@/components/Button";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { requireSessionUser } from "@/lib/auth";
import { getRequestI18n } from "@/lib/i18n-server";

export default async function WalletPage() {
  const session = await requireSessionUser();
  const { dictionary } = await getRequestI18n();

  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-7xl px-4 pb-28 pt-5 sm:px-8 sm:pt-8">
      <div className="glass-panel overflow-hidden rounded-[2rem] p-4 md:p-6">
        <header className="rounded-[1.8rem] bg-[radial-gradient(circle_at_top_left,rgba(16,106,100,0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(214,107,66,0.1),transparent_30%),linear-gradient(135deg,#fffaf4_0%,#f7efe5_52%,#f1e5d7_100%)] px-5 py-6 md:px-7 md:py-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.28em] text-[var(--color-muted)]">
                Saree Pro
              </p>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Wallet workspace
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--color-muted)]">
                  Balance, transactions, and loyalty rewards are now served from real read-only
                  endpoints for the active session.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/workspace">
                <Button variant="ghost" className="bg-white/75">
                  Back to workspace
                </Button>
              </Link>
              <Link href="/workspace/orders">
                <Button variant="secondary">Orders hub</Button>
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-5">
          <WalletDashboard userId={session.id} />
        </section>
      </div>

      <MobileBottomNav showOwner={session.ownerAccess || session.role === "admin"} />
    </main>
  );
}
