import { Hero } from "@/components/sections/home/Hero";
import { AfricaMapSection } from "@/components/sections/home/AtlasMap";
import { FeaturedArtists } from "@/components/sections/home/FeaturedArtists";
import { CollectorPicks, type CollectorPick } from "@/components/sections/home/CollectorPicks";
import { DiscoverOrigin } from "@/components/sections/home/DiscoverOrigin";
import { MissionStats } from "@/components/sections/home/MissionStats";
import { ProcessSteps, Newsletter } from "@/components/sections/home/ProcessAndNewsletter";
import { ARTWORKS } from "@/lib/data/content";
import { getMostRequestedArtworks } from "@/lib/data/supabase-artists-cached";
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
  const [mostRequested, blocks] = await Promise.all([getMostRequestedArtworks(6), getPageBlocks("home")]);

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
      <AfricaMapSection />
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
