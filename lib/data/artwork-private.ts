import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type ArtworkRow = Database["public"]["Tables"]["artworks"]["Row"];

/**
 * Columns any visitor may read from public.artworks (see migration
 * 20261118000000_security_hardening.sql). Price and originality data are not
 * among them; dashboards get those through artwork_private_fields().
 */
export const PUBLIC_ARTWORK_COLUMNS =
  "id, slug, title, description, year, medium, dimensions, country, image_url, thumb_base, status, artist_id, managed_artist_id, translations, reference_number, created_at, updated_at";

export type PublicArtwork = Omit<
  ArtworkRow,
  "price_usd" | "originality_status" | "originality_score" | "originality_report" | "originality_checked_at" | "image_phash"
>;

type PrivateFields = Pick<
  ArtworkRow,
  "id" | "price_usd" | "originality_status" | "originality_score" | "originality_report" | "originality_checked_at" | "image_phash"
>;

/** Price and originality fields for the caller's own artworks (or all, for admins). */
export async function fetchPrivateFields(opts: { ids?: string[]; originality?: string[] } = {}): Promise<PrivateFields[]> {
  if (opts.ids && opts.ids.length === 0) return [];
  const { data, error } = await supabase.rpc("artwork_private_fields", {
    p_ids: opts.ids ?? null,
    p_originality: opts.originality ?? null,
  });
  if (error) {
    console.error("[artwork_private_fields]", error.message);
    return [];
  }
  return (data ?? []) as unknown as PrivateFields[];
}

/** Adds price/originality fields to public artwork rows. Rows the caller may
 * not see privately get price 0 and status "unchecked" (never shown publicly). */
export async function withPrivateFields(rows: PublicArtwork[]): Promise<ArtworkRow[]> {
  const extra = await fetchPrivateFields({ ids: rows.map((r) => r.id) });
  const byId = new Map(extra.map((e) => [e.id, e]));
  return rows.map((r) => {
    const e = byId.get(r.id);
    return {
      ...r,
      price_usd: e?.price_usd ?? 0,
      originality_status: e?.originality_status ?? ("unchecked" as ArtworkRow["originality_status"]),
      originality_score: e?.originality_score ?? null,
      originality_report: e?.originality_report ?? null,
      originality_checked_at: e?.originality_checked_at ?? null,
      image_phash: e?.image_phash ?? null,
    };
  });
}
