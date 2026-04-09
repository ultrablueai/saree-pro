import { redirect } from "next/navigation";
import { OwnerAccessForm } from "@/app/owner-access/OwnerAccessForm";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { StatusPill } from "@/components/StatusPill";
import { getSessionUser } from "@/lib/auth";
import { getRequestI18n } from "@/lib/i18n-server";

export default async function OwnerAccessPage() {
  const session = await getSessionUser();
  const { locale, dictionary } = await getRequestI18n();

  if (session?.ownerAccess) {
    redirect("/workspace");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-10 sm:px-10">
      <div className="w-full rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[0_30px_80px_-52px_rgba(28,25,23,0.45)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <StatusPill label={dictionary.auth.restrictedRoute} tone="warning" />
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
              {dictionary.auth.ownerTitle}
            </h1>
            <p className="mt-4 text-base leading-7 text-[var(--color-muted)]">
              {dictionary.auth.ownerBody}
            </p>
          </div>
          <LanguageSwitcher currentLocale={locale} label={dictionary.common.language} />
        </div>
        <div className="mt-8">
          <OwnerAccessForm
            labels={{
              accessCode: dictionary.auth.accessCode,
              openOwnerConsole: dictionary.auth.openOwnerConsole,
              helper:
                locale === "ar"
                  ? "أدخل كود المالك فقط، وسيتم فتح لوحة الإدارة العليا مباشرة."
                  : locale === "tr"
                    ? "Sadece sahip kodunu girin; sistem sizi dogrudan yonetim paneline alir."
                    : "Enter the owner code only and the system will open the elevated workspace directly.",
            }}
          />
        </div>
      </div>
    </main>
  );
}
