// Server-only cached wrappers around lib/data/supabase-artists.ts's Supabase
// reads. Kept in a separate module rather than caching inline there because
// that file is also imported client-side, and unstable_cache can't be
// bundled into client code. Server pages that list
// artists/artworks (discover, artists directory, artwork detail, homepage)
// should import from here instead so repeat page views don't each re-hit
// Supabase — same 60s window used for Sanity CMS reads elsewhere. The
// optional language argument is part of each cache key (unstable_cache keys
// include the call arguments), so each language is cached separately.
import { unstable_cache } from "next/cache";
import type { Language } from "@/lib/i18n/config";
import {
  getPublishedArtworksByIds as fetchPublishedArtworksByIds,
  getMostRequestedArtworks as fetchMostRequestedArtworks,
  getPublishedArtworkBySlug as fetchPublishedArtworkBySlug,
} from "@/lib/data/supabase-artists";
import {
  getRealArtists as fetchRealArtists,
  getCountryCounts as fetchCountryCounts,
  listPublishedArtworks as fetchPublishedPage,
  countPublishedArtworks as fetchPublishedCount,
  type ListOptions,
} from "@/lib/data/artwork-listing";

// Tagged so an artist publishing/editing/deleting an artwork can invalidate
// this instantly via revalidateTag("artworks") instead of waiting out the
// 60s window — see app/api/revalidate/route.ts.
// Each listing is cached per page/filter, so an entry is one page of works
// (a few KB), never the catalogue. Free-text search is not cached: its keys
// are unbounded and each query is a single indexed request anyway.
export const listPublishedArtworks = (opts: ListOptions) =>
  opts.search
    ? fetchPublishedPage(opts)
    : unstable_cache(
        () => fetchPublishedPage(opts),
        [
          "published-page",
          opts.lang,
          opts.country ?? "",
          opts.artistSlug ?? "",
          opts.excludeSlug ?? "",
          String(opts.offset ?? 0),
          String(opts.limit),
          opts.withTotal ? "t" : "",
        ],
        { revalidate: 60, tags: ["artworks"] },
      )();

export const getCountryCounts = unstable_cache(fetchCountryCounts, ["country-counts"], {
  revalidate: 60,
  tags: ["artworks"],
});

export const countPublishedArtworks = unstable_cache(fetchPublishedCount, ["published-count"], {
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
