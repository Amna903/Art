"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { ENABLED_LOCALES, LOCALE_LABELS, LOCALE_NATIVE_NAMES } from "@/lib/i18n/config";

/**
 * Language dropdown (EN · FR · PT · ES · IT). Picking a language keeps the
 * visitor on the same page under that language's URL and remembers the choice
 * in a cookie, which proxy.ts reads on their next visit. Languages not yet
 * signed off for this deployment (see REVIEWED in lib/i18n/config.ts) are left
 * out.
 */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t("Language")}: ${LOCALE_NATIVE_NAMES[language]}`}
        className="flex items-center gap-0.5 min-h-[36px] px-1 text-xs font-semibold uppercase tracking-widest text-on-surface hover:text-secondary transition-colors"
      >
        {LOCALE_LABELS[language]}
        <span
          aria-hidden="true"
          className={`material-symbols-outlined text-[16px] text-on-surface/50 transition-transform ${open ? "rotate-180" : ""}`}
        >
          expand_more
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t("Language")}
          className="absolute right-0 top-full z-[60] mt-2 min-w-[160px] border border-[var(--brand-cinza)]/40 bg-surface py-1 shadow-lg"
        >
          {ENABLED_LOCALES.map((lang) => {
            const active = lang === language;
            return (
              <li key={lang} role="option" aria-selected={active}>
                <button
                  type="button"
                  lang={lang}
                  onClick={() => {
                    setOpen(false);
                    setLanguage(lang);
                  }}
                  className={`flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface-container-low ${
                    active ? "text-secondary" : "text-on-surface"
                  }`}
                >
                  <span>{LOCALE_NATIVE_NAMES[lang]}</span>
                  <span className="text-[11px] font-semibold tracking-widest opacity-60">{LOCALE_LABELS[lang]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
