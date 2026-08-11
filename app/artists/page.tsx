import { Suspense } from "react";
import type { Metadata } from "next";
import { ArtistDirectory } from "@/components/sections/artists/ArtistDirectory";
import { ARTIST_COUNT, COUNTRY_COUNT, ARTISTS, type Technique } from "@/lib/data/artists";
import { getArtists } from "@/lib/sanity/queries";
import { getRealArtists } from "@/lib/data/supabase-artists-cached";

export const metadata: Metadata = {
  title: "Artists | NU-ART",
  description: `${ARTIST_COUNT} contemporary African artists across ${COUNTRY_COUNT} nations.`,
};

// Same 60s window + artworks tag as homepage/detail — profile avatar edits
// invalidate via pingRevalidate("artworks").
export const revalidate = 60;

export default async function ArtistsPage() {
  // Priority: real Supabase self-service artists → Sanity CMS → static fallback
  const realArtists = await getRealArtists();
  const cmsArtists = await getArtists();

  const sourceArtists =
    realArtists.length > 0
      ? realArtists
      : cmsArtists.length > 0
        ? cmsArtists.map((a) => ({
            slug: a.slug,
            name: a.name,
            countryCode: a.countryCode ?? "",
            countryName: a.countryName ?? "",
            countrySlug: a.countrySlug ?? "",
            city: a.city ?? "",
            technique: (a.technique as Technique) ?? "Painting",
            worksCount: a.worksCount ?? 0,
            newDiscovery: a.newDiscovery,
            featuredWork: a.featuredWork ?? "",
            bio: a.bio ?? "",
            image: a.imageUrl ?? "",
          }))
        : ARTISTS;

  return (
    <Suspense>
      <ArtistDirectory artists={sourceArtists} />
    </Suspense>
  );
}