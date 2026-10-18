"use client";

import type { Quote } from "@/lib/data/quotes";
import { useLanguage } from "@/lib/i18n";

/**
 * One quote at a time, with generous space and clear attribution. The quote
 * and the speaker's name stay in their original language (translate="no");
 * the role line ("Ghanaian artist") is ours, so it is translated. The source
 * is kept in the markup's `cite` for the record.
 */
export function QuoteBlock({ quote, tone = "light", className = "" }: { quote: Quote; tone?: "light" | "dark"; className?: string }) {
  const { t } = useLanguage();
  const muted = tone === "dark" ? "text-[var(--nua-grey-light)]" : "text-[var(--nua-grey)]";
  return (
    <figure className={`mx-auto max-w-3xl px-6 py-16 text-center md:py-24 ${className}`}>
      <span aria-hidden="true" className="mx-auto mb-8 block h-[2px] w-12 bg-[var(--nua-red)]" />
      <blockquote cite={quote.source} translate="no" lang="en">
        <p className="font-display text-[clamp(1.6rem,3.4vw,2.6rem)] leading-[1.25]">“{quote.text}”</p>
      </blockquote>
      <figcaption className="mt-8">
        <span className="block text-base font-semibold" translate="no">{quote.author}</span>
        <span className={`block text-sm ${muted}`}>{t(quote.role)}</span>
      </figcaption>
    </figure>
  );
}
