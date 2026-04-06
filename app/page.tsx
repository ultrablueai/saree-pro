import Link from "next/link";
import { redirect } from "next/navigation";
import { AppInstallActions } from "@/components/AppInstallActions";
import { Button } from "@/components/Button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SectionHeading } from "@/components/SectionHeading";
import { StatusPill } from "@/components/StatusPill";
import { appConfig } from "@/lib/app-config";
import { getSessionUser } from "@/lib/auth";
import { getDashboardMetrics } from "@/lib/dashboard-metrics";
import { envStatus } from "@/lib/env";
import { getRequestI18n } from "@/lib/i18n-server";

const executionLanes = [
  {
    title: "Customer experience",
    points: [
      "Saved addresses and repeat ordering",
      "Clear checkout totals and payment method state",
      "Live status timeline from confirmation to delivery",
    ],
  },
  {
    title: "Merchant workflow",
    points: [
      "Menu availability and pricing control",
      "Preparation queue with order urgency",
      "Operational readiness per branch",
    ],
  },
  {
    title: "Driver dispatch",
    points: [
      "Availability, verification, and active route assignment",
      "Pickup and drop-off visibility",
      "Dispatch handoff with fewer manual calls",
    ],
  },
];

const productionAreas = [
  "Typed domain models for users, merchants, drivers, payments, and orders",
  "Environment readiness checks for Supabase before app features depend on it",
  "Role-aware product scope instead of a single marketing-only homepage",
  "A delivery workflow that can be extended into auth, dashboards, and APIs",
];

export default async function Home() {
  const session = await getSessionUser();
  const dbSummary = await getDashboardMetrics().catch(() => null);
  const { locale, dictionary } = await getRequestI18n();

  if (session) {
    redirect("/workspace");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 pb-20 pt-8 sm:px-10 lg:px-12">
      <header className="mb-14 flex flex-col gap-5 rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_30px_80px_-48px_rgba(28,25,23,0.45)] backdrop-blur md:flex-row md:items-center md:justify-between md:p-8">
        <div className="space-y-3">
          <StatusPill
            label={envStatus.ready ? dictionary.home.backendReady : dictionary.home.backendSetupNeeded}
            tone={envStatus.ready ? "success" : "warning"}
          />
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-[var(--color-muted)]">
              {appConfig.name}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {dictionary.home.title}
            </h1>
          </div>
          <p className="max-w-3xl text-base leading-7 text-[var(--color-muted)] sm:text-lg">
            {dictionary.home.body}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LanguageSwitcher currentLocale={locale} label={dictionary.common.language} />
          <Link href="/login">
            <Button>{dictionary.common.enterPlatform}</Button>
          </Link>
          <Link href="#scope">
            <Button variant="secondary">{dictionary.home.reviewScope}</Button>
          </Link>
        </div>
      </header>

      <section className="mb-10">
        <AppInstallActions
          installLabel="Install app"
          shareLabel="Share app"
          installedLabel="App installed"
          helperText="Install Saree Pro on your phone or share the live link with customers, merchants, and drivers."
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[0_25px_70px_-52px_rgba(28,25,23,0.45)]">
          <SectionHeading
            eyebrow={dictionary.home.executionEyebrow}
            title={dictionary.home.executionTitle}
            description={dictionary.home.executionDescription}
          />

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {executionLanes.map((lane) => (
              <article
                key={lane.title}
                className="rounded-[1.5rem] border border-[var(--color-border)] bg-white/70 p-5"
              >
                <h3 className="text-lg font-semibold">{lane.title}</h3>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--color-muted)]">
                  {lane.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>

        <aside
          id="readiness"
          className="rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-ink)] p-8 text-white shadow-[0_30px_80px_-52px_rgba(28,25,23,0.75)]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
            {dictionary.home.readinessEyebrow}
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            {dictionary.home.readinessTitle}
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/70">
            {dictionary.home.readinessBody}
          </p>

          <div className="mt-6 space-y-3">
            {envStatus.missing.map((key) => (
              <div
                key={key}
                className="rounded-2xl border border-white/10 bg-white/8 p-4 text-sm text-white/80"
              >
                Supabase optional later:{" "}
                <span className="font-mono text-white">{key}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/8 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
              {dictionary.home.immediateNextSlice}
            </p>
            <p className="mt-3 text-sm leading-6 text-white/80">
              {dictionary.home.immediateNextBody}
            </p>
          </div>
        </aside>
      </section>

      <section className="mt-16 rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[0_25px_70px_-52px_rgba(28,25,23,0.45)]">
        <SectionHeading
          eyebrow="Local Backend"
          title="The app can now run against a database we control inside this project."
          description="This avoids waiting on cloud provisioning and gives us a proper base for users, merchants, menus, orders, and payment records."
        />

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {dbSummary
            ? [
                { label: "Users", value: dbSummary.users },
                { label: "Merchants", value: dbSummary.merchants },
                { label: "Orders", value: dbSummary.orders },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.5rem] border border-[var(--color-border)] bg-white/75 p-5"
                >
                  <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">
                    {item.label}
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">
                    {item.value}
                  </p>
                </div>
              ))
            : [
                "Run the first Prisma migration to initialize the local database.",
                "Then we can seed merchants, menu items, and example orders.",
                "After that, we wire role-aware auth and operational dashboards.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[1.5rem] border border-[var(--color-border)] bg-white/75 p-5 text-sm leading-6 text-[var(--color-muted)]"
                >
                  {item}
                </div>
              ))}
        </div>
      </section>

      <section id="scope" className="mt-16 rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[0_25px_70px_-52px_rgba(28,25,23,0.45)]">
        <SectionHeading
          eyebrow="Production Scope"
          title="The codebase now reflects platform concerns instead of placeholder content."
          description="This is the working direction for the product foundation. Each item below is already represented in the code structure or prepared for the next slice."
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {productionAreas.map((item) => (
            <div
              key={item}
              className="rounded-[1.5rem] border border-[var(--color-border)] bg-white/75 p-5 text-sm leading-6 text-[var(--color-muted)]"
            >
              {item}
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-accent-soft)] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-accent-strong)]">
              Milestones
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--color-ink)]">
              {appConfig.milestones.map((milestone) => (
                <li key={milestone}>{milestone}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-white/75 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
              Delivery principle
            </p>
            <p className="mt-4 text-base leading-7 text-[var(--color-muted)]">
              We will keep building vertically: data model, API contract, role
              permissions, then UI for the exact workflow. That is the fastest
              way to reach a usable product without getting trapped in mockups.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
