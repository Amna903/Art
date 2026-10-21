import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { isLocale, localizePath, DEFAULT_LOCALE } from "@/lib/i18n/config";

/**
 * Permanent QR entry point: nua-arte.com/q/<id>.
 *
 * Printed QR codes encode the record's id (never its slug), so a label keeps
 * working when a title, slug or page layout changes. The id may be an artwork
 * (→ its page while published, otherwise its artist's page — /artworks/<slug>
 * only renders published works) or a managed artist (→ their profile).
 * Anything unknown lands on /artists.
 *
 * Always a 307 (temporary) redirect, so phones and browsers never cache the
 * target and admins can change where a code points just by editing the record.
 */

// RLS hides unpublished artworks from anon, but a sold or archived work's label
// should still reach its artist — so read with the service key when available.
// Only slugs and artist links are selected; nothing private is exposed.
function reader() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return supabase;
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang: rawLang, id } = await params;
  const lang = isLocale(rawLang) ? rawLang : DEFAULT_LOCALE;
  const go = (path: string) => NextResponse.redirect(new URL(localizePath(path, lang), request.url), 307);

  if (!isSupabaseConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) return go("/artists");

  try {
    const db = reader();
    const { data: artwork } = await db
      .from("artworks")
      .select("slug, status, artist_id, managed_artist_id")
      .eq("id", id)
      .maybeSingle();

    if (artwork) {
      if (artwork.status === "published") return go(`/artworks/${artwork.slug}?ref=qr`);
      if (artwork.managed_artist_id) {
        const { data: managed } = await db
          .from("managed_artists")
          .select("slug")
          .eq("id", artwork.managed_artist_id)
          .maybeSingle();
        if (managed) return go(`/artists/${managed.slug}?ref=qr`);
      }
      return go(`/artists/${artwork.artist_id}?ref=qr`);
    }

    const { data: artist } = await db.from("managed_artists").select("slug").eq("id", id).maybeSingle();
    if (artist) return go(`/artists/${artist.slug}?ref=qr`);
  } catch (err) {
    console.error("[QR] Failed to resolve", id, err);
  }

  return go("/artists");
}
