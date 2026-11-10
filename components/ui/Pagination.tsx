import Link from "@/components/i18n/Link";
import { getT } from "@/lib/i18n/server";
import type { Language } from "@/lib/i18n/config";

/** Reads "?page=" as a 1-based page number. */
export function pageFrom(value: string | string[] | undefined): number {
  const n = Number(typeof value === "string" ? value : undefined);
  return Number.isInteger(n) && n > 1 ? n : 1;
}

/**
 * Server-rendered page links ("‹ 1 2 3 … 9 ›") for paged listings. `href`
 * builds the link for a page number, keeping the page's other parameters.
 */
export async function Pagination({
  page,
  pageCount,
  href,
  lang,
}: {
  page: number;
  pageCount: number;
  href: (page: number) => string;
  lang: Language;
}) {
  if (pageCount <= 1) return null;
  const t = await getT(lang);

  // First, last, and two either side of the current page.
  const shown = [...new Set([1, pageCount, page - 2, page - 1, page, page + 1, page + 2])]
    .filter((n) => n >= 1 && n <= pageCount)
    .sort((a, b) => a - b);

  const base = "flex h-10 min-w-10 items-center justify-center border px-3 text-sm";
  const idle = `${base} border-[var(--nua-line)] text-primary hover:border-[var(--nua-charcoal)]`;

  return (
    <nav aria-label={t("Pages")} className="mt-12 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 && (
        <Link href={href(page - 1)} className={idle} aria-label={t("Previous page")} rel="prev">
          ‹
        </Link>
      )}
      {shown.map((n, i) => (
        <span key={n} className="contents">
          {i > 0 && n - shown[i - 1] > 1 && <span className="px-1 text-on-surface-variant">…</span>}
          {n === page ? (
            <span aria-current="page" className={`${base} border-[var(--nua-charcoal)] bg-[var(--nua-charcoal)] text-[var(--nua-white)]`}>
              {n}
            </span>
          ) : (
            <Link href={href(n)} className={idle}>
              {n}
            </Link>
          )}
        </span>
      ))}
      {page < pageCount && (
        <Link href={href(page + 1)} className={idle} aria-label={t("Next page")} rel="next">
          ›
        </Link>
      )}
    </nav>
  );
}
