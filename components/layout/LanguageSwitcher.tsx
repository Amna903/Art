"use client";

import { useLanguage, type Language } from "@/lib/i18n";

/**
 * EN / FR language switcher. Portuguese is intentionally not offered.
 * Preference persists in localStorage and drives site-wide French translations.
 */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <select
        aria-label="Language / Langue"
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="bg-transparent text-xs font-semibold uppercase tracking-widest text-on-surface hover:text-secondary cursor-pointer py-1 pl-1 pr-4 outline-none appearance-none transition-colors border-b border-transparent hover:border-secondary/40 focus:border-secondary"
      >
        <option value="en" className="bg-surface text-on-surface">
          EN
        </option>
        <option value="fr" className="bg-surface text-on-surface">
          FR
        </option>
      </select>
      <span
        aria-hidden="true"
        className="material-symbols-outlined pointer-events-none absolute right-0 text-[14px] text-on-surface/50 transition-transform"
      >
        expand_more
      </span>
    </div>
  );
}
