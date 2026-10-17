import { unstable_cache } from "next/cache";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/types";
import type { Language } from "@/lib/i18n/config";
import { localized } from "@/lib/i18n/content";

export type PageBlock = { value: string; alt_text: string | null; translations?: Json };
export type PageBlocks = Record<string, PageBlock>;

async function fetchPageBlocks(page: string): Promise<PageBlocks> {
  if (!isSupabaseConfigured()) return {};
  try {
    const { data, error } = await supabase
      .from("page_blocks")
      .select("block_key, value, alt_text, translations")
      .eq("page", page);

    if (error || !data) {
      if (error) console.error(`[Supabase] Failed to fetch page_blocks for "${page}":`, error.message);
      return {};
    }
    return Object.fromEntries(
      data.map((r) => [r.block_key, { value: r.value, alt_text: r.alt_text, translations: r.translations }]),
    );
  } catch (err) {
    console.error(`[Supabase] Failed to fetch page_blocks for "${page}":`, err);
    return {};
  }
}

/** Cached per page; invalidated via revalidateTag("page-blocks") after editable saves.
 * Values come back in `lang` where an admin has translated them inline
 * (EditableText/EditableImage on that language's page), otherwise English. */
export async function getPageBlocks(page: string, lang: Language = "en"): Promise<PageBlocks> {
  const blocks = await unstable_cache(() => fetchPageBlocks(page), ["page-blocks", page], {
    revalidate: 60,
    tags: ["page-blocks"],
  })();
  if (lang === "en") return blocks;
  return Object.fromEntries(
    Object.entries(blocks).map(([key, block]) => [
      key,
      {
        ...block,
        value: localized(block.translations, "value", lang, block.value),
        alt_text: localized(block.translations, "alt_text", lang, block.alt_text),
      },
    ]),
  );
}

/** Text falls back to the page's original hardcoded copy when unedited or blank. */
export function blockText(blocks: PageBlocks, key: string, fallback: string): string {
  const v = blocks[key]?.value?.trim();
  return v ? v : fallback;
}

/** Images fall back the same way; alt text falls back independently. */
export function blockImage(
  blocks: PageBlocks,
  key: string,
  fallback: { src: string; alt: string },
): { src: string; alt: string } {
  const src = blocks[key]?.value?.trim();
  const alt = blocks[key]?.alt_text?.trim();
  return { src: src || fallback.src, alt: alt || fallback.alt };
}
