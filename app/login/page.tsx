import Link from "next/link";
import { redirect } from "next/navigation";
import { ClientRoleButtons } from "@/app/login/ClientRoleButtons";
import { LoginFormCard } from "@/app/login/LoginFormCard";
import { AppInstallActions } from "@/components/AppInstallActions";
import { Button } from "@/components/Button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { StatusPill } from "@/components/StatusPill";
import { appConfig } from "@/lib/app-config";
import { getSessionUser } from "@/lib/auth";
import { getRequestI18n } from "@/lib/i18n-server";
import type { Locale } from "@/lib/i18n";

const loginContentByLocale: Record<
  Locale,
  {
    shellEyebrow: string;
    shellTitle: string;
    shellBody: string;
    quickAccessEyebrow: string;
    quickAccessTitle: string;
    quickAccessBody: string;
    ownerAccessLabel: string;
    ownerAccessBody: string;
    ownerAccessAction: string;
    installHelperText: string;
    formLabels: {
      signInTab: string;
      signUpTab: string;
      formTitle: string;
      formBody: string;
      fullName: string;
      email: string;
      password: string;
      role: string;
      submitSignIn: string;
      submitSignUp: string;
      busy: string;
      toggleToSignUpLead: string;
      toggleToSignUpAction: string;
      toggleToSignInLead: string;
      toggleToSignInAction: string;
      customer: string;
      merchant: string;
      driver: string;
    };
  }
> = {
  en: {
    shellEyebrow: "Public entry",
    shellTitle: "Sign in to the right workspace without exposing owner access.",
    shellBody:
      "Customers, merchants, and drivers can all enter from one polished screen. Owner access stays on its own protected route so the public surface stays clean.",
    quickAccessEyebrow: "Quick access",
    quickAccessTitle: "Open the exact role you want to test in one step.",
    quickAccessBody:
      "Use the real email flow on the left when you want durable accounts, or jump straight into a seeded workspace while we continue shipping product slices.",
    ownerAccessLabel: "Restricted route",
    ownerAccessBody:
      "Owner and elevated admin access stay separated from the public role selector.",
    ownerAccessAction: "Open owner access",
    installHelperText:
      "Add Saree Pro to the home screen or share the login link with your team.",
    formLabels: {
      signInTab: "Sign in",
      signUpTab: "Create account",
      formTitle: "Access the platform",
      formBody:
        "Use your real credentials here. New accounts can be created for customer, merchant, and driver roles.",
      fullName: "Full name",
      email: "Email address",
      password: "Password",
      role: "Account type",
      submitSignIn: "Sign in",
      submitSignUp: "Create account",
      busy: "Working...",
      toggleToSignUpLead: "Need a new account?",
      toggleToSignUpAction: "Create one",
      toggleToSignInLead: "Already have an account?",
      toggleToSignInAction: "Sign in",
      customer: "Customer",
      merchant: "Merchant",
      driver: "Driver",
    },
  },
  ar: {
    shellEyebrow: "الدخول العام",
    shellTitle: "ادخل إلى لوحة العمل الصحيحة دون كشف وصول المالك للعامة.",
    shellBody:
      "يمكن للعميل والتاجر والسائق الدخول من شاشة واحدة مرتبة وواضحة، بينما يبقى وصول المالك في مسار محمي مستقل حتى تظل الواجهة العامة نظيفة.",
    quickAccessEyebrow: "دخول سريع",
    quickAccessTitle: "افتح الدور الذي تريد اختباره فورًا بخطوة واحدة.",
    quickAccessBody:
      "استخدم نموذج البريد الحقيقي في الجهة اليسرى إذا أردت حسابات دائمة، أو ادخل مباشرة إلى لوحة تجريبية جاهزة بينما نكمل بناء الشرائح التالية من المنتج.",
    ownerAccessLabel: "مسار محمي",
    ownerAccessBody:
      "وصول المالك والإدارة العليا يبقى منفصلًا عن محدد الأدوار العام.",
    ownerAccessAction: "فتح دخول المالك",
    installHelperText:
      "أضف Saree Pro إلى الشاشة الرئيسية أو شارك رابط الدخول مع فريقك.",
    formLabels: {
      signInTab: "تسجيل الدخول",
      signUpTab: "إنشاء حساب",
      formTitle: "الدخول إلى المنصة",
      formBody:
        "استخدم بياناتك الحقيقية هنا. يمكن إنشاء حسابات جديدة لأدوار العميل والتاجر والسائق.",
      fullName: "الاسم الكامل",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      role: "نوع الحساب",
      submitSignIn: "تسجيل الدخول",
      submitSignUp: "إنشاء الحساب",
      busy: "جارٍ التنفيذ...",
      toggleToSignUpLead: "تحتاج إلى حساب جديد؟",
      toggleToSignUpAction: "أنشئ حسابًا",
      toggleToSignInLead: "لديك حساب بالفعل؟",
      toggleToSignInAction: "سجل الدخول",
      customer: "عميل",
      merchant: "تاجر",
      driver: "سائق",
    },
  },
  tr: {
    shellEyebrow: "Genel giris",
    shellTitle: "Sahip erisimini aciga cikarmadan dogru panele girin.",
    shellBody:
      "Musteri, magaza ve surucu tek ve duzenli ekrandan girer. Sahip erisimi ise ayrica korumali rotada kalir; boylece genel yuz temiz kalir.",
    quickAccessEyebrow: "Hizli erisim",
    quickAccessTitle: "Test etmek istediginiz role tek adimda girin.",
    quickAccessBody:
      "Kalici hesaplar icin soldaki gercek e-posta akislarini kullanin ya da urun dilimlerini gelistirmeye devam ederken hazir role dogrudan girin.",
    ownerAccessLabel: "Korumali rota",
    ownerAccessBody:
      "Sahip ve yuksek yetkili admin erisimi genel rol secicisinden ayridir.",
    ownerAccessAction: "Sahip erisimini ac",
    installHelperText:
      "Saree Pro uygulamasini ana ekrana ekleyin veya giris baglantisini ekiple paylasin.",
    formLabels: {
      signInTab: "Giris yap",
      signUpTab: "Hesap olustur",
      formTitle: "Platforma eris",
      formBody:
        "Gercek bilgilerinizi burada kullanin. Musteri, magaza ve surucu rolleri icin yeni hesap olusturabilirsiniz.",
      fullName: "Tam ad",
      email: "E-posta adresi",
      password: "Sifre",
      role: "Hesap tipi",
      submitSignIn: "Giris yap",
      submitSignUp: "Hesap olustur",
      busy: "Isleniyor...",
      toggleToSignUpLead: "Yeni hesaba mi ihtiyaciniz var?",
      toggleToSignUpAction: "Olusturun",
      toggleToSignInLead: "Zaten hesabin var mi?",
      toggleToSignInAction: "Giris yap",
      customer: "Musteri",
      merchant: "Magaza",
      driver: "Surucu",
    },
  },
};

export default async function LoginPage() {
  const session = await getSessionUser();
  const { locale, dictionary } = await getRequestI18n();

  if (session) {
    redirect("/workspace");
  }

  const content = loginContentByLocale[locale];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 pb-16 pt-8 sm:px-10 lg:px-12">
      <section className="overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-ink)] text-white shadow-[0_35px_90px_-52px_rgba(28,25,23,0.72)]">
        <div className="grid gap-8 px-6 py-7 md:grid-cols-[1.2fr_0.8fr] md:px-8 md:py-8">
          <div>
            <StatusPill label={content.shellEyebrow} tone="success" />
            <p className="mt-4 text-sm font-medium uppercase tracking-[0.28em] text-white/55">
              {appConfig.name}
            </p>
            <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl">
              {content.shellTitle}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-white/72 sm:text-lg">
              {content.shellBody}
            </p>
          </div>

          <div className="flex flex-col items-start gap-4 md:items-end">
            <LanguageSwitcher
              currentLocale={locale}
              label={dictionary.common.language}
              className="bg-white/95"
            />
            <div className="rounded-[1.5rem] border border-white/10 bg-white/8 p-5 text-sm leading-6 text-white/78">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
                {content.ownerAccessLabel}
              </p>
              <p className="mt-3">{content.ownerAccessBody}</p>
              <Link href="/owner-access" className="mt-4 inline-flex">
                <Button variant="secondary" className="bg-white text-[var(--color-ink)]">
                  {content.ownerAccessAction}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <LoginFormCard labels={content.formLabels} />

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-7 shadow-[0_28px_80px_-48px_rgba(28,25,23,0.42)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-accent-strong)]">
              {content.quickAccessEyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              {content.quickAccessTitle}
            </h2>
            <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
              {content.quickAccessBody}
            </p>

            <div className="mt-7">
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
            </div>
          </div>

          <AppInstallActions
            installLabel="Install app"
            shareLabel="Share app"
            installedLabel="App installed"
            helperText={content.installHelperText}
          />
        </div>
      </section>
    </main>
  );
}
