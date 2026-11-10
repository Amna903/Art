import { Hero } from "@/components/sections/home/Hero";
import { HomeIntro } from "@/components/sections/home/HomeIntro";
import { QuoteBlock } from "@/components/sections/QuoteBlock";
import { quoteFor } from "@/lib/data/quotes";
import { AfricaMapSectionLazy } from "@/components/sections/home/AtlasMapLazy";
import { FeaturedArtists } from "@/components/sections/home/FeaturedArtists";
import { CollectorPicks, type CollectorPick } from "@/components/sections/home/CollectorPicks";
import { DiscoverOrigin } from "@/components/sections/home/DiscoverOrigin";
import { ProcessSteps, Newsletter } from "@/components/sections/home/ProcessAndNewsletter";
import { getDirectoryArtists } from "@/lib/data/directory";
import { normalizeCountrySlug } from "@/lib/data/africa";
import { getCountryCounts, getMostRequestedArtworks, listPublishedArtworks } from "@/lib/data/supabase-artists-cached";
import type { SupabaseArtwork } from "@/lib/data/supabase-artists";
import { getPageBlocks } from "@/lib/data/pageBlocks";
import { getSiteHero } from "@/lib/data/site-heroes";
import { getSiteVisits } from "@/lib/data/site-stats";
import { resolveLang } from "@/lib/i18n/server";

export const revalidate = 60;

function toPick(artwork: SupabaseArtwork): Omit<CollectorPick, "collection"> {
  return { slug: artwork.slug, title: artwork.title, artist: artwork.artistName, image: artwork.thumbUrl ?? artwork.imageUrl };
}

function ThreadDivider() {
  return (
    <div className="py-14">
      <span className="nu-thread-divider" aria-hidden="true" />
    </div>
  );
}

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const lang = resolveLang((await params).lang);
  // Counts come from a GROUP BY in the database and the picks from a 6-row
  // query — the homepage never loads the catalogue.
  const [mostRequested, newest, countryCounts, directoryArtists, blocks, siteHero, visits] =
    await Promise.all([
      getMostRequestedArtworks(6, lang),
      listPublishedArtworks({ lang, limit: 6 }),
      getCountryCounts(),
      getDirectoryArtists(lang),
      getPageBlocks("home", lang),
      getSiteHero("home", lang),
      getSiteVisits(),
    ]);

  // Countries represent the distinct nations the artists are associated with
  const uniqueCountries = new Set([
    ...directoryArtists
      .map((artist) =>
        normalizeCountrySlug(artist.countrySlug || artist.countryName || ""),
      )
      .filter(Boolean),
    ...countryCounts.map((c) => c.slug).filter((slug) => slug !== "other"),
  ]);

  const atlasStats = {
    artists: directoryArtists.length,
    artworks: countryCounts.reduce((sum, c) => sum + c.works, 0),
    countries: uniqueCountries.size,
    countrySlugs: [...uniqueCountries],
    visits,
  };

  // Collector Picks: real published works only, most requested first, then
  // the newest (change brief §6: no sample works by invented artists).
  const requestedIds = new Set(mostRequested.map((a) => a.id));
  const picks: CollectorPick[] = [
    ...mostRequested.map((artwork) => ({ ...toPick(artwork), collection: "MOST REQUESTED" })),
    ...newest.items.filter((a) => !requestedIds.has(a.id)).map((artwork) => ({ ...toPick(artwork), collection: "CURATORIAL SELECTION" })),
  ].slice(0, 3);

  const placeQuote = quoteFor("explore-by-country");

  return (
    <>
      <Hero blocks={blocks} siteHero={siteHero} />
      <HomeIntro />
      <FeaturedArtists />
      <ThreadDivider />
      <AfricaMapSectionLazy stats={atlasStats} />
      {placeQuote && <QuoteBlock quote={placeQuote} />}
      {picks.length > 0 && <CollectorPicks picks={picks} />}
      <DiscoverOrigin />
      <ThreadDivider />
      <ProcessSteps />
      <Newsletter />
    </>
  );
}
