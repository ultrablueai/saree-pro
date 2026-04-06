export const locales = ["en", "ar", "tr"] as const;

export type Locale = (typeof locales)[number];
export type TextDirection = "ltr" | "rtl";

export const defaultLocale: Locale = "en";
export const localeCookieName = "sareepro_locale";
export const localeQueryParam = "lang";

export const localeMeta: Record<Locale, { label: string; dir: TextDirection }> = {
  en: { label: "English", dir: "ltr" },
  ar: { label: "العربية", dir: "rtl" },
  tr: { label: "Turkce", dir: "ltr" },
};

export interface TranslationDictionary {
  brand: {
    name: string;
    tagline: string;
  };
  nav: {
    overview: string;
    workspace: string;
    login: string;
    ownerAccess: string;
    signOut: string;
  };
  common: {
    language: string;
    enterPlatform: string;
    backToOverview: string;
    chooseWorkspace: string;
    welcome: string;
  };
  auth: {
    localAuthActive: string;
    publicEntry: string;
    restrictedRoute: string;
    ownerConsole: string;
    loginTitle: string;
    loginBody: string;
    ownerTitle: string;
    ownerBody: string;
    ownerEmail: string;
    accessCode: string;
    openOwnerConsole: string;
    customerDescription: string;
    merchantDescription: string;
    driverDescription: string;
  };
  home: {
    backendReady: string;
    backendSetupNeeded: string;
    title: string;
    body: string;
    reviewScope: string;
    executionEyebrow: string;
    executionTitle: string;
    executionDescription: string;
    readinessEyebrow: string;
    readinessTitle: string;
    readinessBody: string;
    immediateNextSlice: string;
    immediateNextBody: string;
  };
  workspaces: {
    customer: string;
    merchant: string;
    driver: string;
    owner: string;
    admin: string;
    ownerAccess: string;
    workspaceIntro: string;
  };
}

export const dictionaries: Record<Locale, TranslationDictionary> = {
  en: {
    brand: {
      name: "Saree Pro",
      tagline: "A delivery platform built for real operations.",
    },
    nav: {
      overview: "Overview",
      workspace: "Workspace",
      login: "Login",
      ownerAccess: "Owner access",
      signOut: "Sign out",
    },
    common: {
      language: "Language",
      enterPlatform: "Enter platform",
      backToOverview: "Back to overview",
      chooseWorkspace: "Choose the workspace to continue",
      welcome: "Welcome",
    },
    auth: {
      localAuthActive: "Local auth active",
      publicEntry: "Public entry",
      restrictedRoute: "Restricted route",
      ownerConsole: "Owner console",
      loginTitle: "One platform, multiple workspaces, and no public owner entry point.",
      loginBody:
        "Public sign-in is intentionally limited to customer, merchant, and driver flows. Owner access is isolated behind a separate protected route and code.",
      ownerTitle: "Owner access",
      ownerBody:
        "This route is intentionally separate from public role selection. It is meant for the platform owner or a trusted operator with elevated access.",
      ownerEmail: "Owner email",
      accessCode: "Access code",
      openOwnerConsole: "Open owner console",
      customerDescription: "Ordering, address precision, and live order visibility.",
      merchantDescription: "Catalog control, kitchen queue, and operational readiness.",
      driverDescription: "Task radar, route execution, and earning visibility.",
    },
    home: {
      backendReady: "backend ready",
      backendSetupNeeded: "backend setup needed",
      title: "Building a production-grade delivery platform, not a template.",
      body:
        "The project is now aligned around real product lanes: ordering, merchant operations, driver dispatch, and admin oversight. We will keep pushing it as an actual system, not a throwaway demo.",
      reviewScope: "Review scope",
      executionEyebrow: "Execution",
      executionTitle: "We are shaping the app around the jobs each role must complete.",
      executionDescription:
        "That keeps us from wasting time on generic pages and lets us build features in a sequence that can survive production use.",
      readinessEyebrow: "Readiness",
      readinessTitle: "Supabase connection status",
      readinessBody:
        "We now have a local-first backend path. Supabase can return later, but the product no longer depends on a cloud free tier just to keep moving.",
      immediateNextSlice: "Immediate next build slice",
      immediateNextBody:
        "Local database models, migrations, and repository access are now the active foundation. Authentication can be layered on top of this without blocking on external infrastructure.",
    },
    workspaces: {
      customer: "Customer workspace",
      merchant: "Merchant workspace",
      driver: "Driver workspace",
      owner: "Owner console",
      admin: "Admin workspace",
      ownerAccess: "owner access",
      workspaceIntro:
        "This workspace is now driven by a real session and hidden owner access model. The next development step is extending each role into full operational CRUD.",
    },
  },
  ar: {
    brand: {
      name: "سريع برو",
      tagline: "منصة توصيل مبنية للتشغيل الحقيقي.",
    },
    nav: {
      overview: "نظرة عامة",
      workspace: "لوحة العمل",
      login: "تسجيل الدخول",
      ownerAccess: "دخول المالك",
      signOut: "تسجيل الخروج",
    },
    common: {
      language: "اللغة",
      enterPlatform: "دخول المنصة",
      backToOverview: "العودة للنظرة العامة",
      chooseWorkspace: "اختر لوحة العمل للمتابعة",
      welcome: "مرحبًا",
    },
    auth: {
      localAuthActive: "المصادقة المحلية فعالة",
      publicEntry: "الدخول العام",
      restrictedRoute: "مسار محمي",
      ownerConsole: "لوحة المالك",
      loginTitle: "منصة واحدة، لوحات متعددة، ولا يوجد مدخل مالك علني.",
      loginBody:
        "تم حصر الدخول العام في العميل والتاجر والسائق فقط. وصول المالك مفصول في مسار مستقل ومحمي برمز خاص.",
      ownerTitle: "دخول المالك",
      ownerBody:
        "هذا المسار منفصل عمدًا عن اختيار الأدوار العامة. وهو مخصص لمالك المنصة أو لمشغل موثوق بصلاحيات مرتفعة.",
      ownerEmail: "بريد المالك",
      accessCode: "رمز الوصول",
      openOwnerConsole: "فتح لوحة المالك",
      customerDescription: "الطلب، دقة العنوان، ومتابعة الطلبات المباشرة.",
      merchantDescription: "إدارة المنتجات، صف المطبخ، والجاهزية التشغيلية.",
      driverDescription: "رادار المهام، تنفيذ المسار، ومتابعة الأرباح.",
    },
    home: {
      backendReady: "الخلفية جاهزة",
      backendSetupNeeded: "الخلفية تحتاج إعدادًا",
      title: "نبني منصة توصيل إنتاجية حقيقية، لا مجرد قالب.",
      body:
        "المشروع أصبح مرتبًا حول مسارات منتج فعلية: الطلب، عمليات التاجر، توزيع السائقين، وإشراف الإدارة. وسنكمل تطويره كنظام حقيقي لا كنموذج مؤقت.",
      reviewScope: "مراجعة النطاق",
      executionEyebrow: "التنفيذ",
      executionTitle: "نحن نبني التطبيق حول المهام الفعلية التي يجب أن ينجزها كل دور.",
      executionDescription:
        "هذا يمنعنا من إضاعة الوقت على صفحات عامة، ويسمح لنا ببناء الميزات بتسلسل يمكنه الصمود في التشغيل الفعلي.",
      readinessEyebrow: "الجاهزية",
      readinessTitle: "حالة اتصال Supabase",
      readinessBody:
        "لدينا الآن مسار خلفي محلي أولًا. يمكن أن يعود Supabase لاحقًا، لكن المنتج لم يعد متوقفًا على خطة سحابية مجانية حتى نتابع العمل.",
      immediateNextSlice: "شريحة البناء التالية",
      immediateNextBody:
        "نماذج البيانات المحلية والوصول إلى المستودع أصبحت الآن هي الأساس النشط. ويمكن إضافة المصادقة فوقها دون تعطيل العمل بانتظار بنية خارجية.",
    },
    workspaces: {
      customer: "لوحة العميل",
      merchant: "لوحة التاجر",
      driver: "لوحة السائق",
      owner: "لوحة المالك",
      admin: "لوحة الإدارة",
      ownerAccess: "دخول المالك",
      workspaceIntro:
        "هذه اللوحة تعمل الآن بجلسة حقيقية ونموذج وصول مخفي للمالك. والخطوة التالية هي توسيع كل دور إلى CRUD تشغيلي كامل.",
    },
  },
  tr: {
    brand: {
      name: "Saree Pro",
      tagline: "Gercek operasyonlar icin olusturulmus teslimat platformu.",
    },
    nav: {
      overview: "Genel bakis",
      workspace: "Calisma alani",
      login: "Giris",
      ownerAccess: "Sahip erisimi",
      signOut: "Cikis yap",
    },
    common: {
      language: "Dil",
      enterPlatform: "Platforma gir",
      backToOverview: "Genel gorunume don",
      chooseWorkspace: "Devam etmek icin paneli secin",
      welcome: "Hos geldin",
    },
    auth: {
      localAuthActive: "Yerel kimlik dogrulama aktif",
      publicEntry: "Genel giris",
      restrictedRoute: "Korumali rota",
      ownerConsole: "Sahip konsolu",
      loginTitle: "Tek platform, coklu paneller ve herkese acik olmayan sahip girisi.",
      loginBody:
        "Genel giris sadece musteri, magaza ve surucu akislarina aciktir. Sahip erisimi ayri korumali rota ve kod arkasindadir.",
      ownerTitle: "Sahip erisimi",
      ownerBody:
        "Bu rota bilerek genel rol seciminden ayridir. Yuksek yetkili platform sahibi veya guvenilir operator icindir.",
      ownerEmail: "Sahip e-postasi",
      accessCode: "Erisim kodu",
      openOwnerConsole: "Sahip konsolunu ac",
      customerDescription: "Siparis, adres dogrulugu ve canli siparis gorunurlugu.",
      merchantDescription: "Katalog kontrolu, mutfak sirasi ve operasyonel hazirlik.",
      driverDescription: "Gorev radari, rota uygulamasi ve kazanc gorunurlugu.",
    },
    home: {
      backendReady: "altyapi hazir",
      backendSetupNeeded: "altyapi kurulumu gerekli",
      title: "Sablon degil, uretime hazir teslimat platformu insa ediyoruz.",
      body:
        "Proje artik gercek urun akislarina gore duzenlendi: siparis, magaza operasyonlari, surucu yonlendirme ve yonetim denetimi. Bunu gosterim degil, gercek sistem olarak gelistirmeye devam ediyoruz.",
      reviewScope: "Kapsami incele",
      executionEyebrow: "Uygulama",
      executionTitle: "Uygulamayi her rolun tamamlamasi gereken islerin etrafinda sekillendiriyoruz.",
      executionDescription:
        "Bu, genel sayfalarda zaman kaybetmemizi engeller ve uretimde ayakta kalabilecek ozellikleri dogru sirayla kurmamizi saglar.",
      readinessEyebrow: "Hazirlik",
      readinessTitle: "Supabase baglanti durumu",
      readinessBody:
        "Artik yerel once yaklasimimiz var. Supabase daha sonra geri donebilir ancak urun ilerlemek icin ucretsiz bulut katmanina bagimli degil.",
      immediateNextSlice: "Bir sonraki dilim",
      immediateNextBody:
        "Yerel veritabani modelleri, gecisler ve depo erisimi aktif temel haline geldi. Kimlik dogrulama bundan sonra harici altyapi beklemeden eklenebilir.",
    },
    workspaces: {
      customer: "Musteri paneli",
      merchant: "Magaza paneli",
      driver: "Surucu paneli",
      owner: "Sahip konsolu",
      admin: "Yonetim paneli",
      ownerAccess: "sahip erisimi",
      workspaceIntro:
        "Bu panel artik gercek oturum ve gizli sahip erisimi modeliyle calisiyor. Siradaki adim her rolu tam operasyonel CRUD akisina genisletmek.",
    },
  },
};

export function isLocale(value: string | null | undefined): value is Locale {
  return Boolean(value && locales.includes(value as Locale));
}

export function parseLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : defaultLocale;
}

export function getDirection(locale: Locale): TextDirection {
  return localeMeta[locale].dir;
}

export function getDictionary(locale: Locale): TranslationDictionary {
  return dictionaries[locale];
}
