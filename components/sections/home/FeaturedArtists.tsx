import { ARTISTS } from "@/lib/data/content";
import { getRealArtists } from "@/lib/data/supabase-artists-cached";
import { getCountryBySlug } from "@/lib/data/africa";
import { FeaturedArtistsCarousel, type FeaturedCard } from "./FeaturedArtistsCarousel";

export async function FeaturedArtists() {
  // The real NUA-ARTE artists (change brief §6). The static demo artists only
  // appear on a build without any real artists (local development).
  const realArtists = await getRealArtists();
  const withPhoto = [...realArtists].sort((a, b) => Number(!!b.image) - Number(!!a.image) || b.worksCount - a.worksCount);
  const cards: FeaturedCard[] =
    realArtists.length > 0
      ? withPhoto.slice(0, 6).map((artist) => ({
          slug: artist.slug,
          name: artist.name,
          country: getCountryBySlug(artist.countrySlug)?.name ?? (artist.countryName || "Africa"),
          discipline: artist.technique || "art",
          image: artist.image,
        }))
      : ARTISTS.slice(0, 3).map((artist) => ({
          slug: artist.slug,
          name: artist.name,
          country: artist.country,
          discipline: artist.discipline,
          image: artist.image,
        }));

  return (
    <section className="bg-surface-container-low py-section-gap px-gutter-page overflow-hidden">
      <div className="max-w-container-max mx-auto">
        <FeaturedArtistsCarousel cards={cards} />
      </div>
    </section>
  );
}
