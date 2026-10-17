import { supabase } from "@/lib/supabase/client";
import type { Language } from "@/lib/i18n/config";
import { asTranslations } from "@/lib/i18n/content";

/**
 * Saves an inline page-block edit in the language it was made in. English
 * edits write the block's own columns; other languages write
 * translations[lang] and leave the English original alone. Image sources are
 * shared by every language; only their alt text is per-language.
 */
export async function savePageBlock({
  page,
  blockKey,
  lang,
  value,
  altText,
  englishFallback,
}: {
  page: string;
  blockKey: string;
  lang: Language;
  /** Text for a text block, image URL for an image block. */
  value: string;
  altText?: string;
  /** The page's built-in English copy — stored as the block's English value
   * when a translation is saved before anyone has edited the English. */
  englishFallback: { value: string; altText?: string };
}) {
  const isImage = altText !== undefined;
  if (lang === "en") {
    return supabase
      .from("page_blocks")
      .upsert(
        { page, block_key: blockKey, value, ...(isImage ? { alt_text: altText } : {}) },
        { onConflict: "page,block_key" },
      );
  }

  const { data: existing } = await supabase
    .from("page_blocks")
    .select("value, alt_text, translations")
    .eq("page", page)
    .eq("block_key", blockKey)
    .maybeSingle();

  const translations = asTranslations(existing?.translations);
  const forLang: Record<string, string> = { ...(translations[lang] ?? {}) };
  if (isImage) forLang.alt_text = altText ?? "";
  else forLang.value = value;

  return supabase.from("page_blocks").upsert(
    {
      page,
      block_key: blockKey,
      // Images share one source across languages.
      value: isImage ? value : (existing?.value ?? englishFallback.value),
      alt_text: isImage ? (existing?.alt_text ?? englishFallback.altText ?? null) : (existing?.alt_text ?? null),
      translations: { ...translations, [lang]: forLang },
    },
    { onConflict: "page,block_key" },
  );
}
