"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { usePathname, useRouter as useNextRouter } from "next/navigation";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  localizePath,
  stripLocale,
  type Language,
} from "./config";
import {
  formatDate,
  formatNumber,
  formatShortDate,
  formatUsd,
  translate,
  UNTRANSLATED,
  type Dictionary,
  type TranslateVars,
} from "./translate";

export type { Language } from "./config";

type LanguageContextType = {
  language: Language;
  /** Switches language, remembers the choice and stays on the same page. */
  setLanguage: (lang: Language) => void;
  /** English source string → current language (English if not translated). */
  t: (text: string, vars?: TranslateVars) => string;
  /** Prefixes an internal path with the current language. */
  localize: (href: string) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatShortDate: (value: Date | string | number) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatUsd: (value: number) => string;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

const ONE_YEAR = 60 * 60 * 24 * 365;

function rememberLanguage(lang: Language) {
  try {
    document.cookie = `${LOCALE_COOKIE}=${lang}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  } catch {
    // Cookies blocked — the URL still carries the language.
  }
}

/**
 * Text React doesn't own through t() — mostly copy in server components and
 * data files — is still translated by matching whole DOM text nodes against
 * the dictionary. Server components should prefer getT() from
 * lib/i18n/server so the HTML is translated before it reaches the browser;
 * this is the safety net.
 */
function useDomTranslation(language: Language, dictionary: Dictionary) {
  useEffect(() => {
    if (language === DEFAULT_LOCALE) return;

    const translateNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const textNode = node as Text;
        const value = textNode.nodeValue || "";
        const trimmed = value.trim();
        if (!trimmed || UNTRANSLATED.has(trimmed) || !dictionary[trimmed]) return;
        const next = translate(dictionary, value);
        if (next !== value) textNode.nodeValue = next;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE", "PRE"].includes(el.tagName)) return;
        if (el.getAttribute("translate") === "no") return;
        el.childNodes.forEach(translateNode);
      }
    };

    translateNode(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "childList") m.addedNodes.forEach(translateNode);
        else if (m.type === "characterData") translateNode(m.target);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [language, dictionary]);
}

export function LanguageProvider({
  language,
  dictionary,
  children,
}: {
  language: Language;
  dictionary: Dictionary;
  children: ReactNode;
}) {
  const router = useNextRouter();
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useDomTranslation(language, dictionary);

  const setLanguage = useCallback(
    (lang: Language) => {
      rememberLanguage(lang);
      if (lang === language) return;
      const { search, hash } = window.location;
      router.push(localizePath(stripLocale(pathname || "/"), lang) + search + hash);
    },
    [language, pathname, router],
  );

  const value = useMemo<LanguageContextType>(
    () => ({
      language,
      setLanguage,
      t: (text, vars) => translate(dictionary, text, vars),
      localize: (href) => localizePath(href, language),
      formatDate: (v, options) => formatDate(v, language, options),
      formatShortDate: (v) => formatShortDate(v, language),
      formatNumber: (v, options) => formatNumber(v, language, options),
      formatUsd: (v) => formatUsd(v, language),
    }),
    [language, setLanguage, dictionary],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

const FALLBACK: LanguageContextType = {
  language: DEFAULT_LOCALE,
  setLanguage: () => {},
  t: (text, vars) => translate({}, text, vars),
  localize: (href) => href,
  formatDate: (v, options) => formatDate(v, DEFAULT_LOCALE, options),
  formatShortDate: (v) => formatShortDate(v, DEFAULT_LOCALE),
  formatNumber: (v, options) => formatNumber(v, DEFAULT_LOCALE, options),
  formatUsd: (v) => formatUsd(v, DEFAULT_LOCALE),
};

export function useLanguage(): LanguageContextType {
  return useContext(LanguageContext) ?? FALLBACK;
}

/** usePathname() without the language prefix, for active-link checks. */
export function useUnlocalizedPathname(): string {
  return stripLocale(usePathname() || "/");
}

/** next/navigation's useRouter, with push/replace/prefetch kept in the
 * current language. */
export function useRouter() {
  const router = useNextRouter();
  const { localize } = useLanguage();
  return useMemo(
    () => ({
      ...router,
      push: (href: string, options?: Parameters<typeof router.push>[1]) => router.push(localize(href), options),
      replace: (href: string, options?: Parameters<typeof router.replace>[1]) =>
        router.replace(localize(href), options),
      prefetch: (href: string, options?: Parameters<typeof router.prefetch>[1]) =>
        router.prefetch(localize(href), options),
    }),
    [router, localize],
  );
}
