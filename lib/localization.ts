// Enhanced Localization System for Saree Pro
// Supports Arabic (RTL), Turkish (LTR), and English (LTR)

export type Language = 'ar' | 'tr' | 'en';

export interface TranslationKeys {
  // Navigation
  home: string;
  orders: string;
  profile: string;
  notifications: string;
  
  // User Roles
  customer: string;
  driver: string;
  merchant: string;
  admin: string;
  
  // Order Status
  pending: string;
  confirmed: string;
  preparing: string;
  ready: string;
  picked_up: string;
  delivered: string;
  cancelled: string;
  
  // Actions
  order: string;
  track: string;
  contact: string;
  pay: string;
  cancel: string;
  
  // Location
  current_location: string;
  use_gps: string;
  address_details: string;
  building: string;
  floor: string;
  apartment: string;
  landmark: string;
  
  // Pricing
  surge_pricing: string;
  high_demand: string;
  delivery_fee: string;
  subtotal: string;
  total: string;
  tax: string;
  
  // Wallet & Loyalty
  wallet: string;
  balance: string;
  loyalty_points: string;
  points: string;
  rewards: string;
  
  // AI Features
  smart_suggestions: string;
  ai_assistant: string;
  generate_description: string;
  analyze_sales: string;
  
  // Emergency
  sos: string;
  emergency: string;
  report_issue: string;
  
  // WhatsApp
  order_via_whatsapp: string;
  whatsapp_support: string;
  
  // Driver Features
  quest: string;
  daily_missions: string;
  bonus: string;
  eta: string;
  silent_eta: string;
  
  // Merchant Features
  kitchen_queue: string;
  start_preparing: string;
  ready_for_pickup: string;
  optimize_menu: string;
  
  // Admin Features
  financial_ledger: string;
  driver_verification: string;
  compliance: string;
  strategic_report: string;
  
  // Common
  loading: string;
  error: string;
  success: string;
  retry: string;
  save: string;
  edit: string;
  delete: string;
  close: string;
  back: string;
  next: string;
  done: string;
}

export const translations: Record<Language, TranslationKeys> = {
  ar: {
    // Navigation
    home: 'الرئيسية',
    orders: 'الطلبات',
    profile: 'الملف الشخصي',
    notifications: 'الإشعارات',
    
    // User Roles
    customer: 'عميل',
    driver: 'سائق',
    merchant: 'تاجر',
    admin: 'مدير',
    
    // Order Status
    pending: 'في الانتظار',
    confirmed: 'مؤكد',
    preparing: 'قيد التحضير',
    ready: 'جاهز',
    picked_up: 'تم الاستلام',
    delivered: 'تم التسليم',
    cancelled: 'ملغي',
    
    // Actions
    order: 'اطلب',
    track: 'تتبع',
    contact: 'تواصل',
    pay: 'ادفع',
    cancel: 'إلغاء',
    
    // Location
    current_location: 'الموقع الحالي',
    use_gps: 'استخدم موقع GPS',
    address_details: 'تفاصيل العنوان',
    building: 'المبنى',
    floor: 'الطابق',
    apartment: 'الشقة',
    landmark: 'معلم',
    
    // Pricing
    surge_pricing: 'التسعير الديناميكي',
    high_demand: 'طلب مرتفع في منطقتك',
    delivery_fee: 'رسوم التوصيل',
    subtotal: 'المجموع الفرعي',
    total: 'الإجمالي',
    tax: 'الضريبة',
    
    // Wallet & Loyalty
    wallet: 'المحفظة',
    balance: 'الرصيد',
    loyalty_points: 'نقاط الولاء',
    points: 'نقاط',
    rewards: 'المكافآت',
    
    // AI Features
    smart_suggestions: 'اقتراحات ذكية',
    ai_assistant: 'مساعد الذكاء الاصطناعي',
    generate_description: 'توليد وصف',
    analyze_sales: 'تحليل المبيعات',
    
    // Emergency
    sos: 'استغاثة',
    emergency: 'طوارئ',
    report_issue: 'الإبلاغ عن مشكلة',
    
    // WhatsApp
    order_via_whatsapp: 'طلب عبر WhatsApp',
    whatsapp_support: 'دعم WhatsApp',
    
    // Driver Features
    quest: 'مهمة',
    daily_missions: 'المهام اليومية',
    bonus: 'مكافأة',
    eta: 'الوقت المتوقع',
    silent_eta: 'إرسال الوقت المتوقع',
    
    // Merchant Features
    kitchen_queue: 'قائمة المطبخ',
    start_preparing: 'بدء التحضير',
    ready_for_pickup: 'جاهز للاستلام',
    optimize_menu: 'تحسين القائمة',
    
    // Admin Features
    financial_ledger: 'السجل المالي',
    driver_verification: 'توثيق السائق',
    compliance: 'الامتثال',
    strategic_report: 'تقرير استراتيجي',
    
    // Common
    loading: 'جاري التحميل...',
    error: 'خطأ',
    success: 'نجح',
    retry: 'إعادة المحاولة',
    save: 'حفظ',
    edit: 'تعديل',
    delete: 'حذف',
    close: 'إغلاق',
    back: 'رجوع',
    next: 'التالي',
    done: 'تم',
  },
  
  tr: {
    // Navigation
    home: 'Ana Sayfa',
    orders: 'Siparişler',
    profile: 'Profil',
    notifications: 'Bildirimler',
    
    // User Roles
    customer: 'Müşteri',
    driver: 'Sürücü',
    merchant: 'Satıcı',
    admin: 'Yönetici',
    
    // Order Status
    pending: 'Beklemede',
    confirmed: 'Onaylandı',
    preparing: 'Hazırlanıyor',
    ready: 'Hazır',
    picked_up: 'Teslim Alındı',
    delivered: 'Teslim Edildi',
    cancelled: 'İptal Edildi',
    
    // Actions
    order: 'Sipariş Et',
    track: 'Takip Et',
    contact: 'İletişim',
    pay: 'Öde',
    cancel: 'İptal Et',
    
    // Location
    current_location: 'Mevcut Konum',
    use_gps: 'GPS Konumunu Kullan',
    address_details: 'Adres Detayları',
    building: 'Bina',
    floor: 'Kat',
    apartment: 'Daire',
    landmark: 'Yer Belirteci',
    
    // Pricing
    surge_pricing: 'Artan Fiyat',
    high_demand: 'Bölgenizde Yüksek Talep',
    delivery_fee: 'Teslimat Ücreti',
    subtotal: 'Ara Toplam',
    total: 'Genel Toplam',
    tax: 'Vergi',
    
    // Wallet & Loyalty
    wallet: 'Cüzdan',
    balance: 'Bakiye',
    loyalty_points: 'Sadakat Puanları',
    points: 'Puan',
    rewards: 'Ödüller',
    
    // AI Features
    smart_suggestions: 'Akıllı Öneriler',
    ai_assistant: 'YZ Yardımcısı',
    generate_description: 'Açıklama Oluştur',
    analyze_sales: 'Satışları Analiz Et',
    
    // Emergency
    sos: 'SOS',
    emergency: 'Acil Durum',
    report_issue: 'Sorun Bildir',
    
    // WhatsApp
    order_via_whatsapp: 'WhatsApp ile Sipariş',
    whatsapp_support: 'WhatsApp Destek',
    
    // Driver Features
    quest: 'Görev',
    daily_missions: 'Günlük Görevler',
    bonus: 'Bonus',
    eta: 'Tahmini Varış',
    silent_eta: 'ETA Gönder',
    
    // Merchant Features
    kitchen_queue: 'Mutfak Sırası',
    start_preparing: 'Hazırlamaya Başla',
    ready_for_pickup: 'Teslimat için Hazır',
    optimize_menu: 'Menüyü Optimize Et',
    
    // Admin Features
    financial_ledger: 'Finansal Defter',
    driver_verification: 'Sürücü Doğrulama',
    compliance: 'Uyumluluk',
    strategic_report: 'Stratejik Rapor',
    
    // Common
    loading: 'Yükleniyor...',
    error: 'Hata',
    success: 'Başarılı',
    retry: 'Tekrar Dene',
    save: 'Kaydet',
    edit: 'Düzenle',
    delete: 'Sil',
    close: 'Kapat',
    back: 'Geri',
    next: 'Sonraki',
    done: 'Tamamlandı',
  },
  
  en: {
    // Navigation
    home: 'Home',
    orders: 'Orders',
    profile: 'Profile',
    notifications: 'Notifications',
    
    // User Roles
    customer: 'Customer',
    driver: 'Driver',
    merchant: 'Merchant',
    admin: 'Admin',
    
    // Order Status
    pending: 'Pending',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    ready: 'Ready',
    picked_up: 'Picked Up',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    
    // Actions
    order: 'Order',
    track: 'Track',
    contact: 'Contact',
    pay: 'Pay',
    cancel: 'Cancel',
    
    // Location
    current_location: 'Current Location',
    use_gps: 'Use GPS Location',
    address_details: 'Address Details',
    building: 'Building',
    floor: 'Floor',
    apartment: 'Apartment',
    landmark: 'Landmark',
    
    // Pricing
    surge_pricing: 'Surge Pricing',
    high_demand: 'High Demand in Your Area',
    delivery_fee: 'Delivery Fee',
    subtotal: 'Subtotal',
    total: 'Total',
    tax: 'Tax',
    
    // Wallet & Loyalty
    wallet: 'Wallet',
    balance: 'Balance',
    loyalty_points: 'Loyalty Points',
    points: 'Points',
    rewards: 'Rewards',
    
    // AI Features
    smart_suggestions: 'Smart Suggestions',
    ai_assistant: 'AI Assistant',
    generate_description: 'Generate Description',
    analyze_sales: 'Analyze Sales',
    
    // Emergency
    sos: 'SOS',
    emergency: 'Emergency',
    report_issue: 'Report Issue',
    
    // WhatsApp
    order_via_whatsapp: 'Order via WhatsApp',
    whatsapp_support: 'WhatsApp Support',
    
    // Driver Features
    quest: 'Quest',
    daily_missions: 'Daily Missions',
    bonus: 'Bonus',
    eta: 'ETA',
    silent_eta: 'Send ETA',
    
    // Merchant Features
    kitchen_queue: 'Kitchen Queue',
    start_preparing: 'Start Preparing',
    ready_for_pickup: 'Ready for Pickup',
    optimize_menu: 'Optimize Menu',
    
    // Admin Features
    financial_ledger: 'Financial Ledger',
    driver_verification: 'Driver Verification',
    compliance: 'Compliance',
    strategic_report: 'Strategic Report',
    
    // Common
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    retry: 'Retry',
    save: 'Save',
    edit: 'Edit',
    delete: 'Delete',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    done: 'Done',
  },
};

// Language direction for RTL/LTR support
export const languageDirection: Record<Language, 'rtl' | 'ltr'> = {
  ar: 'rtl',
  tr: 'ltr',
  en: 'ltr',
};

// Default language
export const defaultLanguage: Language = 'en';

// Language names in their native scripts
export const languageNames: Record<Language, string> = {
  ar: 'العربية',
  tr: 'Türkçe',
  en: 'English',
};

// Helper functions
export function isRTL(language: Language): boolean {
  return languageDirection[language] === 'rtl';
}

export function getTranslation(language: Language, key: keyof TranslationKeys): string {
  return translations[language]?.[key] || translations[defaultLanguage][key] || key;
}

export function getAllTranslations(language: Language): TranslationKeys {
  return translations[language] || translations[defaultLanguage];
}

// Currency symbols by language/region
export const currencySymbols: Record<Language, string> = {
  ar: 'SAR',
  tr: 'TL',
  en: '$',
};

// Date formats by language
export const dateFormats: Record<Language, string> = {
  ar: 'DD/MM/YYYY',
  tr: 'DD.MM.YYYY',
  en: 'MM/DD/YYYY',
};

// Number formats by language
export const numberFormats: Record<Language, Intl.LocalesArgument> = {
  ar: 'ar-SA',
  tr: 'tr-TR',
  en: 'en-US',
};
