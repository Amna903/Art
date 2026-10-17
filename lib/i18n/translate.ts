import { INTL_LOCALES, type Language } from "./config";

/** English source string → translation. Missing keys fall back to English. */
export type Dictionary = Record<string, string>;

export type TranslateVars = Record<string, string | number>;

export type Translator = (text: string, vars?: TranslateVars) => string;

/**
 * Strings that stay in English in every language. They are never looked up,
 * and the DOM fallback in LanguageProvider skips them too.
 */
export const UNTRANSLATED = new Set([
  "UNSEEN, UNHEARD",
  "UNSEEN.",
  "UNHEARD.",
  "Illuminating Unseen Voices",
]);

function interpolate(text: string, vars?: TranslateVars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

/**
 * Looks `text` up in `dict`, keeping surrounding whitespace, then fills
 * {placeholders} from `vars`. The key is the English source, so an untranslated
 * string always renders as English — never blank, never a key name.
 */
export function translate(dict: Dictionary, text: string, vars?: TranslateVars): string {
  const trimmed = text.trim();
  if (!trimmed || UNTRANSLATED.has(trimmed)) return interpolate(text, vars);
  const hit = dict[trimmed];
  if (!hit) return interpolate(text, vars);
  const leading = text.match(/^\s*/)?.[0] ?? "";
  const trailing = text.match(/\s*$/)?.[0] ?? "";
  return interpolate(leading + hit + trailing, vars);
}

export function createTranslator(dict: Dictionary): Translator {
  return (text, vars) => translate(dict, text, vars);
}

type DateInput = Date | string | number;

/** "November 14, 2026" / "14 novembre 2026" / "14 de novembro de 2026". */
export function formatDate(
  value: DateInput,
  lang: Language,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" },
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(INTL_LOCALES[lang], options).format(date);
}

/** Short numeric date for tables: 11/14/2026 · 14/11/2026. */
export function formatShortDate(value: DateInput, lang: Language): string {
  return formatDate(value, lang, { year: "numeric", month: "2-digit", day: "2-digit" });
}

/** 1,234 · 1 234 · 1.234 */
export function formatNumber(value: number, lang: Language, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(INTL_LOCALES[lang], options).format(value);
}

/** Prices are always US dollars; only the separators follow the language. */
export function formatUsd(value: number, lang: Language): string {
  return formatNumber(value, lang, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
