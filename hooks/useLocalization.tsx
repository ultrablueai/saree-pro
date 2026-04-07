'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  currencySymbols,
  dateFormats,
  defaultLanguage,
  getTranslation,
  isRTL,
  languageDirection,
  languageNames,
  numberFormats,
  translations,
  type Language,
  type TranslationKeys,
} from '../lib/localization';

export type { Language } from '../lib/localization';
export { languageNames } from '../lib/localization';

interface LocalizationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof TranslationKeys) => string;
  isRTL: boolean;
  direction: 'rtl' | 'ltr';
  currencySymbol: string;
  dateFormat: string;
  numberFormat: Intl.LocalesArgument;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

interface LocalizationProviderProps {
  children: ReactNode;
  defaultLang?: Language;
}

export function LocalizationProvider({
  children,
  defaultLang = defaultLanguage,
}: LocalizationProviderProps) {
  const [language, setLanguageState] = useState<Language>(defaultLang);

  useEffect(() => {
    const storedLanguage = localStorage.getItem('saree-language') as Language | null;
    const browserLanguage = navigator.language.split('-')[0] as Language;
    const detectedLanguage =
      storedLanguage ?? (browserLanguage in translations ? browserLanguage : defaultLanguage);

    setLanguageState(detectedLanguage);
    document.documentElement.dir = languageDirection[detectedLanguage];
    document.documentElement.lang = detectedLanguage;
  }, []);

  function setLanguage(lang: Language) {
    setLanguageState(lang);
    localStorage.setItem('saree-language', lang);
    document.documentElement.dir = languageDirection[lang];
    document.documentElement.lang = lang;
  }

  const value: LocalizationContextType = {
    language,
    setLanguage,
    t: (key) => getTranslation(language, key),
    isRTL: isRTL(language),
    direction: languageDirection[language],
    currencySymbol: currencySymbols[language],
    dateFormat: dateFormats[language],
    numberFormat: numberFormats[language],
  };

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
}

export function useFormattedNumber() {
  const { numberFormat } = useLocalization();

  return (value: number, options?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(numberFormat, options).format(value);
}

export function useFormattedCurrency() {
  const { numberFormat, currencySymbol } = useLocalization();

  return (value: number, currency?: string) => {
    const symbol = currency ?? currencySymbol;
    const normalizedCurrency =
      symbol === 'SAR' ? 'SAR' : symbol === 'TL' ? 'TRY' : symbol === '$' ? 'USD' : 'USD';

    return new Intl.NumberFormat(numberFormat, {
      style: 'currency',
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
    }).format(value);
  };
}

export function useFormattedDate() {
  const { numberFormat } = useLocalization();

  return (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
    const dateObject = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(numberFormat, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...options,
    }).format(dateObject);
  };
}
