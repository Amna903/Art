import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { type SupabaseArtwork } from "@/lib/data/supabase-artists";
import { getPublishedArtworksByIds } from "@/lib/data/supabase-artists-cached";
import type { Json } from "@/lib/supabase/types";
import type { Language } from "@/lib/i18n/config";
import { localized } from "@/lib/i18n/content";

export type SupabaseCollection = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverImageUrl: string;
  artworkCount: number;
};

type CollectionRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image_url: string;
  translations: Json;
  collection_artworks: { count: number }[];
};

function toCollection(row: CollectionRow, lang: Language): SupabaseCollection {
  return {
    id: row.id,
    slug: row.slug,
    title: localized(row.translations, "title", lang, row.title),
    description: localized(row.translations, "description", lang, row.description),
    coverImageUrl: row.cover_image_url,
    artworkCount: row.collection_artworks[0]?.count ?? 0,
  };
}

/** Returns [] (not an error) when Supabase isn't configured or has no collections yet. */
export async function getPublishedCollections(lang: Language = "en"): Promise<SupabaseCollection[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    // Ascending (oldest first) so slot-filling in CollectionsView stays
    // stable — a collection that has claimed a static slot doesn't jump
    // to a different one as newer collections are created.
    const { data, error } = await supabase
      .from("collections")
      .select("id, slug, title, description, cover_image_url, translations, collection_artworks(count)")
      .order("created_at", { ascending: true });

    if (error || !data) {
      if (error) console.error("[Supabase] Failed to fetch collections:", error.message);
      return [];
    }
    return data.map((row) => toCollection(row, lang));
  } catch (err) {
    console.error("[Supabase] Failed to fetch collections:", err);
    return [];
  }
}

export async function getCollectionWithArtworksBySlug(
  slug: string,
  lang: Language = "en",
): Promise<{ collection: SupabaseCollection; artworks: SupabaseArtwork[] } | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data: row, error } = await supabase
      .from("collections")
      .select("id, slug, title, description, cover_image_url, translations, collection_artworks(count)")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !row) return null;

    const { data: links } = await supabase
      .from("collection_artworks")
      .select("artwork_id")
      .eq("collection_id", row.id);
    const artworks = await getPublishedArtworksByIds((links ?? []).map((l) => l.artwork_id), lang);

    return { collection: toCollection(row, lang), artworks };
  } catch (err) {
    console.error("[Supabase] Failed to fetch collection by slug:", err);
    return null;
  }
}
