/**
 * Locale configuration shared by proxy.ts, server components and the client
 * LanguageProvider. Kept free of React / server-only imports so it can run in
 * all three.
 *
 * URL scheme: English is unprefixed (/artists); every other language lives
 * under its own prefix (/fr/artists, /pt/artists, /es/artists, /it/artists).
 * Internally proxy.ts rewrites unprefixed URLs to /en/… so every page sits
 * under app/[lang].
 */

export const LOCALES = ["en", "fr", "pt", "es", "it"] as const;
export type Language = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Language = "en";

/** Cookie the language switcher writes; proxy.ts reads it to send a returning
 * visitor on an unprefixed URL to the language they last picked. */
export const LOCALE_COOKIE = "NUA_LOCALE";

/** Short codes shown in the switcher (EN · FR · PT · ES · IT). */
export const LOCALE_LABELS: Record<Language, string> = {
  en: "EN",
  fr: "FR",
  pt: "PT",
  es: "ES",
  it: "IT",
};

/** Each language's own name, for the switcher's accessible labels. */
export const LOCALE_NATIVE_NAMES: Record<Language, string> = {
  en: "English",
  fr: "Français",
  pt: "Português",
  es: "Español",
  it: "Italiano",
};

/** BCP 47 tags passed to Intl for dates and numbers. Portuguese follows the
 * European convention, matching the existing country names ("Egipto"). */
export const INTL_LOCALES: Record<Language, string> = {
  en: "en-US",
  fr: "fr-FR",
  pt: "pt-PT",
  es: "es-ES",
  it: "it-IT",
};

/**
 * Review gate. Spanish and Italian need a native speaker's review, and
 * Portuguese needs Nilton's, before they go public — no unreviewed machine
 * translation on public pages. Set a language to `true` here once its
 * dictionary in lib/i18n/dictionaries/ has been signed off.
 *
 * Unreviewed languages are still available in `next dev`, and on any
 * deployment that lists them in NEXT_PUBLIC_PREVIEW_LOCALES (for example
 * "pt,es,it" on a Vercel preview environment) so reviewers can work on them.
 * Preview pages are served with noindex.
 */
export const REVIEWED: Record<Language, boolean> = {
  en: true,
  fr: true,
  pt: false,
  es: false,
  it: false,
};

const PREVIEW_LOCALES = new Set(
  (process.env.NEXT_PUBLIC_PREVIEW_LOCALES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

export function isLocale(value: string | undefined | null): value is Language {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

/** Whether a language can be served on this deployment. */
export function isEnabledLocale(lang: Language): boolean {
  return REVIEWED[lang] || process.env.NODE_ENV === "development" || PREVIEW_LOCALES.has(lang);
}

/** Whether a language is enabled only for review (not yet signed off). */
export function isPreviewLocale(lang: Language): boolean {
  return !REVIEWED[lang] && isEnabledLocale(lang);
}

export const ENABLED_LOCALES: Language[] = LOCALES.filter(isEnabledLocale);

/** Splits "/pt/artists?x=1" into { lang: "pt", path: "/artists?x=1" }.
 * Unprefixed paths are English. */
export function splitLocale(pathname: string): { lang: Language; path: string } {
  const match = pathname.match(/^\/([a-z]{2})(?=\/|\?|#|$)/);
  if (match && isLocale(match[1])) {
    const rest = pathname.slice(match[0].length);
    return { lang: match[1], path: rest.startsWith("/") ? rest : `/${rest}` };
  }
  return { lang: DEFAULT_LOCALE, path: pathname };
}

/** The path without its locale prefix ("/pt/artists" → "/artists"). */
export function stripLocale(pathname: string): string {
  return splitLocale(pathname).path;
}

/**
 * Adds the language prefix to an internal path: localizePath("/artists", "pt")
 * → "/pt/artists". English, external URLs, API routes, static files and
 * already-prefixed paths are returned unchanged.
 */
export function localizePath(href: string, lang: Language): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  if (href.startsWith("/api/") || href.startsWith("/_next/")) return href;
  if (/^\/[^?#]*\.[a-z0-9]+(?:[?#]|$)/i.test(href)) return href; // static file
  const { path } = splitLocale(href);
  if (lang === DEFAULT_LOCALE) return path;
  if (path === "/") return `/${lang}`;
  if (path.startsWith("/?") || path.startsWith("/#")) return `/${lang}${path.slice(1)}`;
  return `/${lang}${path}`;
}
