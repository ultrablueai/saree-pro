"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  defaultLocale,
  isLocale,
  localeCookieName,
  localeMeta,
  localeQueryParam,
  locales,
  type Locale,
} from "@/lib/i18n";

interface LanguageSwitcherProps {
  mode?: "cookie" | "query";
  className?: string;
  currentLocale?: Locale;
  label?: string;
}

function setLocaleCookie(locale: Locale) {
  document.cookie = `${localeCookieName}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function LanguageSwitcher({
  mode = "cookie",
  className = "",
  currentLocale,
  label = "Lang",
}: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const activeLocale = currentLocale ?? defaultLocale;

  const handleChange = (value: string) => {
    if (!isLocale(value)) {
      return;
    }

    startTransition(() => {
      document.documentElement.lang = value;
      document.documentElement.dir = localeMeta[value].dir;

      if (mode === "cookie") {
        setLocaleCookie(value);
        router.refresh();
        return;
      }

      const params = new URLSearchParams(searchParams.toString());
      params.set(localeQueryParam, value);
      const nextUrl = `${pathname}?${params.toString()}`;
      router.replace(nextUrl);
    });
  };

  return (
    <label
      className={`inline-flex items-center gap-3 rounded-full border border-[var(--color-border)] bg-white/90 px-4 py-2 text-sm text-[var(--color-ink)] shadow-[0_12px_30px_-20px_rgba(28,25,23,0.35)] ${className}`}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
        {label}
      </span>
      <select
        defaultValue={activeLocale}
        disabled={isPending}
        onChange={(event) => handleChange(event.target.value)}
        className="bg-transparent text-sm outline-none"
      >
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {localeMeta[locale].label}
          </option>
        ))}
      </select>
    </label>
  );
}
