// Server-only cached wrappers around lib/data/supabase-artists.ts's Supabase
// reads. Kept in a separate module rather than caching inline there because
// that file is also imported client-side (app/virtual-gallery/page.tsx calls
// getPublishedArtworks() directly from a "use client" component), and
// unstable_cache can't be bundled into client code. Server pages that list
// artists/artworks (discover, artists directory, artwork detail, homepage)
// should import from here instead so repeat page views don't each re-hit
// Supabase — same 60s window used for Sanity CMS reads elsewhere. The
// optional language argument is part of each cache key (unstable_cache keys
// include the call arguments), so each language is cached separately.
import { unstable_cache } from "next/cache";
import type { Language } from "@/lib/i18n/config";
import {
  getPublishedArtworks as fetchPublishedArtworks,
  getPublishedArtworksByIds as fetchPublishedArtworksByIds,
  getMostRequestedArtworks as fetchMostRequestedArtworks,
  getPublishedArtworkBySlug as fetchPublishedArtworkBySlug,
  getRealArtists as fetchRealArtists,
} from "@/lib/data/supabase-artists";

// Tagged so an artist publishing/editing/deleting an artwork can invalidate
// this instantly via revalidateTag("artworks") instead of waiting out the
// 60s window — see app/api/revalidate/route.ts.
export const getPublishedArtworks = unstable_cache(fetchPublishedArtworks, ["published-artworks"], {
  revalidate: 60,
  tags: ["artworks"],
});

export const getPublishedArtworksByIds = (ids: string[], lang: Language = "en") =>
  unstable_cache(() => fetchPublishedArtworksByIds(ids, lang), ["published-artworks-by-ids", ids.join(","), lang], {
    revalidate: 60,
    tags: ["artworks"],
  })();

export const getMostRequestedArtworks = (limit = 6, lang: Language = "en") =>
  unstable_cache(() => fetchMostRequestedArtworks(limit, lang), ["most-requested-artworks", String(limit), lang], {
    revalidate: 60,
    tags: ["artworks"],
  })();

export const getPublishedArtworkBySlug = (slug: string, lang: Language = "en") =>
  unstable_cache(() => fetchPublishedArtworkBySlug(slug, lang), ["published-artwork-by-slug", slug, lang], {
    revalidate: 60,
    tags: ["artworks"],
  })();

export const getRealArtists = unstable_cache(fetchRealArtists, ["real-artists"], {
  revalidate: 60,
  tags: ["artworks"],
});
