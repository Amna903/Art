import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { ArtistDirectory } from "@/components/sections/artists/ArtistDirectory";
import { ARTIST_COUNT, COUNTRY_COUNT, ARTISTS, type Technique } from "@/lib/data/artists";
import { getArtists } from "@/lib/sanity/queries";
import { getRealArtists } from "@/lib/data/supabase-artists-cached";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang, t } = await getI18n(params);
  // The real count (change brief §6), not a fixed "178 artists across 54 nations".
  const real = await getRealArtists(lang);
  const count = real.length > 0 ? real.length : ARTIST_COUNT;
  const countries = real.length > 0 ? new Set(real.map((a) => a.countrySlug).filter(Boolean)).size : COUNTRY_COUNT;
  return {
    title: t("Artists | NUA-ARTE"),
    description: t("{artists} contemporary African artists across {countries} nations.", {
      artists: count,
      countries,
    }),
  };
}

// Same 60s window + artworks tag as homepage/detail — profile avatar edits
// invalidate via pingRevalidate("artworks").
export const revalidate = 60;

export default async function ArtistsPage({ params }: PageProps<"/[lang]/artists">) {
  const { lang } = await getI18n(params);
  // Priority: real Supabase self-service artists → Sanity CMS → static fallback
  const realArtists = await getRealArtists(lang);
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