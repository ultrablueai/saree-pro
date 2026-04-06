import Link from "next/link";
import { redirect } from "next/navigation";
import { ClientRoleButtons } from "@/app/login/ClientRoleButtons";
import { AppInstallActions } from "@/components/AppInstallActions";
import { Button } from "@/components/Button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { StatusPill } from "@/components/StatusPill";
import { appConfig } from "@/lib/app-config";
import { getSessionUser } from "@/lib/auth";
import { getRequestI18n } from "@/lib/i18n-server";

export default async function LoginPage() {
  const session = await getSessionUser();
  const { locale, dictionary } = await getRequestI18n();

  if (session) {
    redirect("/workspace");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-6 py-10 sm:px-10">
      <div className="overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_30px_80px_-52px_rgba(28,25,23,0.5)]">
        <section className="border-b border-[var(--color-border)] bg-[var(--color-ink)] px-8 py-10 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <StatusPill label={dictionary.auth.localAuthActive} tone="success" />
              <p className="mt-4 text-sm font-medium uppercase tracking-[0.28em] text-white/60">
                {appConfig.name}
              </p>
              <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl">
                {dictionary.auth.loginTitle}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/72">
                {dictionary.auth.loginBody}
              </p>
            </div>
            <LanguageSwitcher
              currentLocale={locale}
              label={dictionary.common.language}
              className="bg-white/95"
            />
          </div>
        </section>

        <section className="px-8 py-10">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-accent-strong)]">
                {dictionary.auth.publicEntry}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
                {dictionary.common.chooseWorkspace}
              </h2>
            </div>
            <Link href="/">
              <Button variant="secondary">{dictionary.common.backToOverview}</Button>
            </Link>
          </div>

          <ClientRoleButtons
            labels={{
              customerTitle: dictionary.workspaces.customer,
              customerDescription: dictionary.auth.customerDescription,
              merchantTitle: dictionary.workspaces.merchant,
              merchantDescription: dictionary.auth.merchantDescription,
              driverTitle: dictionary.workspaces.driver,
              driverDescription: dictionary.auth.driverDescription,
              enterWorkspace: dictionary.common.enterPlatform,
            }}
          />

          <div className="mt-8">
            <AppInstallActions
              installLabel="Install app"
              shareLabel="Share app"
              installedLabel="App installed"
              helperText="Add Saree Pro to the home screen or share the login link with your team."
            />
          </div>
        </section>
      </div>
    </main>
  );
}
