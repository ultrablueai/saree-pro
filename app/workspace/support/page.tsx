import Link from "next/link";
import { Button } from "@/components/Button";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { WhatsAppIntegration } from "@/components/WhatsApp/WhatsAppIntegration";
import { requireSessionUser } from "@/lib/auth";
import { appConfig } from "@/lib/app-config";

export default async function SupportPage() {
  const session = await requireSessionUser();

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
                WhatsApp support
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--color-muted)]">
                Open a direct support conversation for order help, delivery issues, or merchant
                follow-up without leaving the workspace.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/workspace">
                <Button variant="ghost" className="bg-white/75">
                  Back to workspace
                </Button>
              </Link>
              <a href={`mailto:${appConfig.supportEmail}`}>
                <Button variant="secondary">Email support</Button>
              </a>
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-6 lg:grid-cols-[0.36fr_0.64fr]">
          <div className="glass-panel rounded-[1.7rem] p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
              Support scope
            </p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--color-muted)]">
              <p>Order issues and delivery updates</p>
              <p>Merchant questions and menu clarification</p>
              <p>Account or payment escalation</p>
            </div>

            <div className="mt-6 rounded-[1.4rem] border border-[var(--color-border)] bg-white/75 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                Current session
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--color-ink)]">{session.name}</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {session.email} | {session.role}
              </p>
            </div>
          </div>

          <div className="min-h-[34rem]">
            <WhatsAppIntegration
              className="h-full"
              phoneNumber={appConfig.supportWhatsApp}
              businessNumber={appConfig.supportPhone}
              businessName="Saree Pro Support"
              defaultIntent={session.role === "customer" ? "order" : "support"}
            />
          </div>
        </section>
      </div>

      <MobileBottomNav showOwner={session.ownerAccess || session.role === "admin"} />
    </main>
  );
}
