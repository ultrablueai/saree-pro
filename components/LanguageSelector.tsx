"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon, GlobeAltIcon } from "@heroicons/react/24/outline";
import { languageNames, type Language, useLocalization } from "../hooks/useLocalization";

const languages: Array<{ code: Language; flag: string }> = [
  { code: "en", flag: "🇺🇸" },
  { code: "tr", flag: "🇹🇷" },
  { code: "ar", flag: "🇸🇦" },
];

interface LanguageSelectorProps {
  className?: string;
}

export function LanguageSelector({ className = "" }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage, isRTL } = useLocalization();
  const rootRef = useRef<HTMLDivElement>(null);

  const currentLanguage = useMemo(
    () => languages.find((entry) => entry.code === language) ?? languages[0],
    [language],
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Switch language. Current language: ${languageNames[language]}`}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white/90 px-4 py-2 text-sm font-medium text-[var(--color-ink)] shadow-[0_12px_30px_-20px_rgba(28,25,23,0.35)] transition hover:bg-white"
      >
        <GlobeAltIcon className="h-5 w-5 text-[var(--color-accent-strong)]" />
        <span className="text-base">{currentLanguage.flag}</span>
        <span className="hidden sm:inline">{languageNames[language]}</span>
        <ChevronDownIcon
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label="Language options"
          className={`absolute top-full z-50 mt-2 w-56 overflow-hidden rounded-[1.2rem] border border-[var(--color-border)] bg-white/95 shadow-[0_24px_50px_-22px_rgba(28,25,23,0.35)] ${
            isRTL ? "right-0" : "left-0"
          }`}
        >
          {languages.map((entry) => {
            const isActive = entry.code === language;

            return (
              <button
                key={entry.code}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  setLanguage(entry.code);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--color-surface)] ${
                  isActive ? "bg-[var(--color-accent-soft)]" : ""
                }`}
              >
                <span className="text-xl">{entry.flag}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-[var(--color-ink)]">
                    {languageNames[entry.code]}
                  </span>
                  <span className="block text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    {entry.code}
                  </span>
                </span>
                {isActive ? <CheckIcon className="h-4 w-4 text-[var(--color-accent-strong)]" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
