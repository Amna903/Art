import { ARTISTS } from "@/lib/data/content";
import { getRealArtists } from "@/lib/data/supabase-artists-cached";
import { mergeSlots } from "@/lib/utils/mergeSlots";
import { FeaturedArtistsCarousel, type FeaturedCard } from "./FeaturedArtistsCarousel";

export async function FeaturedArtists() {
  // Real, self-service artists (published work on the platform) take over
  // the static demo slots one-for-one — same exchange as the Collections page.
  const realArtists = await getRealArtists();
  const staticCards: FeaturedCard[] = ARTISTS.slice(0, 3).map((artist) => ({
    slug: artist.slug,
    name: artist.name,
    country: artist.country,
    discipline: artist.discipline,
    image: artist.image,
  }));
  const realCards: FeaturedCard[] = realArtists.map((artist) => ({
    slug: artist.slug,
    name: artist.name,
    country: artist.countryName || "Africa",
    discipline: artist.technique || "art",
    image: artist.image,
  }));
  const cards: FeaturedCard[] = mergeSlots(realCards, staticCards).map((card, index) => ({
    ...card,
    badge: index === 0 ? "NEW ADDITION" : undefined,
  }));

  return (
    <section className="bg-surface-container-low py-section-gap px-gutter-page overflow-hidden">
      <div className="max-w-container-max mx-auto">
        <FeaturedArtistsCarousel cards={cards} />
      </div>
    </section>
  );
}
