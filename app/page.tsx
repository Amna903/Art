import { Hero } from "@/components/sections/home/Hero";
import { AfricaMapSection } from "@/components/sections/home/AtlasMap";
import { FeaturedArtists } from "@/components/sections/home/FeaturedArtists";
import { CollectorPicks, type CollectorPick } from "@/components/sections/home/CollectorPicks";
import { DiscoverOrigin } from "@/components/sections/home/DiscoverOrigin";
import { MissionStats } from "@/components/sections/home/MissionStats";
import { ProcessSteps, Newsletter } from "@/components/sections/home/ProcessAndNewsletter";
import { ARTWORKS } from "@/lib/data/content";
import { getDirectoryArtists, getDirectoryArtworks } from "@/lib/data/directory";
import { normalizeCountrySlug } from "@/lib/data/africa";
import { getMostRequestedArtworks } from "@/lib/data/supabase-artists-cached";
import { getPublishedArtworks } from "@/lib/data/supabase-artists";
import { getPageBlocks } from "@/lib/data/pageBlocks";
import { mergeSlots } from "@/lib/utils/mergeSlots";

export const revalidate = 60;

function ThreadDivider() {
  return (
    <div className="py-14">
      <span className="nu-thread-divider" aria-hidden="true" />
    </div>
  );
}

export default async function HomePage() {
  const [mostRequested, publishedArtworks, directoryArtists, directoryArtworks, blocks] =
    await Promise.all([
      getMostRequestedArtworks(6),
      getPublishedArtworks(),
      getDirectoryArtists(),
      getDirectoryArtworks(),
      getPageBlocks("home"),
    ]);

  // Countries represent the distinct nations the artists are associated with
  const uniqueCountries = new Set([
    ...directoryArtists
      .map((artist) =>
        normalizeCountrySlug(artist.countrySlug || artist.countryName || ""),
      )
      .filter(Boolean),
    ...publishedArtworks
      .map((artwork) =>
        normalizeCountrySlug(artwork.artistCountry || artwork.country || ""),
      )
      .filter(Boolean),
  ]);

  const atlasStats = {
    artists: Math.max(
      directoryArtists.length,
      new Set(publishedArtworks.map((artwork) => artwork.artistId)).size,
    ),
    artworks: publishedArtworks.length > 0 ? publishedArtworks.length : directoryArtworks.length,
    countries: uniqueCountries.size,
  };

  // The code decides Collector Picks: artworks ranked by "Request Price"
  // enquiry volume take over the static demo slots one-for-one — same
  // exchange as the Collections page — most sought-after first.
  const staticPicks: CollectorPick[] = ARTWORKS.slice(1, 4).map((artwork) => ({
    slug: artwork.slug,
    title: artwork.title,
    artist: artwork.artist,
    collection: "CURATORIAL SELECTION",
    image: artwork.image,
  }));
  const realPicks: CollectorPick[] = mostRequested.map((artwork) => ({
    slug: artwork.slug,
    title: artwork.title,
    artist: artwork.artistName,
    collection: "MOST REQUESTED",
    image: artwork.imageUrl,
  }));
  const picks = mergeSlots(realPicks, staticPicks);

  return (
    <>
      <Hero blocks={blocks} />
      <ThreadDivider />
      <AfricaMapSection stats={atlasStats} />
      <ThreadDivider />
      <FeaturedArtists />
      <CollectorPicks picks={picks} />
      <DiscoverOrigin />
      <MissionStats />
      <ThreadDivider />
      <ProcessSteps />
      <Newsletter />
    </>
  );
}
