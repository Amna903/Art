import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export type PageBlock = { value: string; alt_text: string | null };
export type PageBlocks = Record<string, PageBlock>;

/** Returns {} (not an error) when Supabase isn't configured or nothing's been edited yet. */
export async function getPageBlocks(page: string): Promise<PageBlocks> {
  if (!isSupabaseConfigured()) return {};
  try {
    const { data, error } = await supabase
      .from("page_blocks")
      .select("block_key, value, alt_text")
      .eq("page", page);

    if (error || !data) {
      if (error) console.error(`[Supabase] Failed to fetch page_blocks for "${page}":`, error.message);
      return {};
    }
    return Object.fromEntries(data.map((r) => [r.block_key, { value: r.value, alt_text: r.alt_text }]));
  } catch (err) {
    console.error(`[Supabase] Failed to fetch page_blocks for "${page}":`, err);
    return {};
  }
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
