// Server-only cached wrappers around lib/data/supabase-artists.ts's Supabase
// reads. Kept in a separate module rather than caching inline there because
// that file is also imported client-side (app/virtual-gallery/page.tsx calls
// getPublishedArtworks() directly from a "use client" component), and
// unstable_cache can't be bundled into client code. Server pages that list
// artists/artworks (discover, artists directory, artwork detail, homepage)
// should import from here instead so repeat page views don't each re-hit
// Supabase — same 60s window used for Sanity CMS reads elsewhere.
import { unstable_cache } from "next/cache";
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

export const getPublishedArtworksByIds = unstable_cache(fetchPublishedArtworksByIds, ["published-artworks-by-ids"], {
  revalidate: 60,
  tags: ["artworks"],
});

export const getMostRequestedArtworks = unstable_cache(fetchMostRequestedArtworks, ["most-requested-artworks"], {
  revalidate: 60,
  tags: ["artworks"],
});

export const getPublishedArtworkBySlug = unstable_cache(fetchPublishedArtworkBySlug, ["published-artwork-by-slug"], {
  revalidate: 60,
  tags: ["artworks"],
});

export const getRealArtists = unstable_cache(fetchRealArtists, ["real-artists"], {
  revalidate: 60,
  tags: ["artworks"],
});
