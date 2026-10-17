import type { Json } from "@/lib/supabase/types";
import type { Language } from "./config";

/** Shape of the `translations` column on content tables:
 * { fr: { title: "…" }, pt: { bio: "…" } }. English lives in the regular
 * columns, so it never appears here. */
export type ContentTranslations = Partial<Record<Exclude<Language, "en">, Record<string, string>>>;

/** Narrows the raw jsonb value; anything malformed reads as "no translations". */
export function asTranslations(value: Json | null | undefined): ContentTranslations {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as ContentTranslations;
}

/**
 * The `field` of a row in `lang`, falling back to the English column when that
 * language or field hasn't been entered yet (or is blank).
 */
export function localized<T extends string | null | undefined>(
  translations: Json | ContentTranslations | null | undefined,
  field: string,
  lang: Language,
  english: T,
): string | T {
  if (lang === "en") return english;
  const value = asTranslations(translations as Json)[lang]?.[field]?.trim();
  return value ? value : english;
}

/** Returns a copy of `translations` with one language's fields replaced;
 * blank fields are dropped so they fall back to English. */
export function withTranslation(
  translations: Json | ContentTranslations | null | undefined,
  lang: Exclude<Language, "en">,
  fields: Record<string, string>,
): ContentTranslations {
  const next = { ...asTranslations(translations as Json) };
  const cleaned = Object.fromEntries(Object.entries(fields).filter(([, v]) => v.trim()));
  if (Object.keys(cleaned).length) next[lang] = cleaned;
  else delete next[lang];
  return next;
}

/** A display copy of `row` with `fields` swapped for their `lang` versions.
 * Use for rendering only — never hand the result to an editor, or the
 * translation would be saved over the English original. */
export function localizeRow<T extends { translations?: Json }, K extends keyof T & string>(
  row: T,
  fields: readonly K[],
  lang: Language,
): T {
  if (lang === "en") return row;
  const copy = { ...row };
  for (const field of fields) {
    const english = row[field] as unknown as string | null | undefined;
    (copy as Record<string, unknown>)[field] = localized(row.translations, field, lang, english);
  }
  return copy;
}
