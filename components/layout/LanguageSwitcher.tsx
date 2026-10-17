"use client";

import { Fragment } from "react";
import { useLanguage } from "@/lib/i18n";
import { ENABLED_LOCALES, LOCALE_LABELS, LOCALE_NATIVE_NAMES } from "@/lib/i18n/config";

/**
 * EN · FR · PT · ES · IT. Picking a language keeps the visitor on the same
 * page under that language's URL and remembers the choice in a cookie, which
 * proxy.ts reads on their next visit. Languages not yet signed off for this
 * deployment (see REVIEWED in lib/i18n/config.ts) are left out.
 */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div role="group" aria-label={t("Language")} className={`flex items-center ${className}`}>
      {ENABLED_LOCALES.map((lang, i) => {
        const active = lang === language;
        return (
          <Fragment key={lang}>
            {i > 0 && (
              <span aria-hidden="true" className="px-0.5 text-[10px] text-on-surface/30">
                ·
              </span>
            )}
            <button
              type="button"
              lang={lang}
              onClick={() => setLanguage(lang)}
              aria-current={active ? "true" : undefined}
              aria-label={LOCALE_NATIVE_NAMES[lang]}
              title={LOCALE_NATIVE_NAMES[lang]}
              className={`min-w-[22px] py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors border-b ${
                active
                  ? "text-secondary border-secondary"
                  : "text-on-surface/70 border-transparent hover:text-secondary"
              }`}
            >
              {LOCALE_LABELS[lang]}
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}
