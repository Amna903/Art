"use client";

import type { Quote } from "@/lib/data/quotes";
import { useLanguage, type Language } from "@/lib/i18n";

/** Each language's own quotation marks. */
const MARKS: Record<Language, [string, string]> = {
  en: ["“", "”"],
  fr: ["« ", " »"],
  pt: ["«", "»"],
  es: ["«", "»"],
  it: ["«", "»"],
};

/**
 * One quote at a time, with generous space and clear attribution. The quote
 * and role are translated; the speaker's name is not. The original English
 * is kept in the markup's `title` and the source in `cite`, for the record.
 */
export function QuoteBlock({ quote, tone = "light", className = "" }: { quote: Quote; tone?: "light" | "dark"; className?: string }) {
  const { t, language } = useLanguage();
  const [open, close] = MARKS[language];
  const muted = tone === "dark" ? "text-[var(--nua-grey-light)]" : "text-[var(--nua-grey)]";
  return (
    <figure className={`mx-auto max-w-3xl px-6 py-16 text-center md:py-24 ${className}`}>
      <span aria-hidden="true" className="mx-auto mb-8 block h-[2px] w-12 bg-[var(--nua-red)]" />
      <blockquote cite={quote.source} title={language === "en" ? undefined : quote.text}>
        <p className="font-display text-[clamp(1.6rem,3.4vw,2.6rem)] leading-[1.25]">
          {open}
          {t(quote.text)}
          {close}
        </p>
      </blockquote>
      <figcaption className="mt-8">
        <span className="block text-base font-semibold" translate="no">{quote.author}</span>
        <span className={`block text-sm ${muted}`}>{t(quote.role)}</span>
      </figcaption>
    </figure>
  );
}
