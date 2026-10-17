import type { Metadata } from "next";
import { VirtualGallery } from "@/components/gallery/VirtualGallery";
import { getPublishedArtworks } from "@/lib/data/supabase-artists-cached";
import { getPageBlocks } from "@/lib/data/pageBlocks";
import { getSiteHero } from "@/lib/data/site-heroes";
import { layoutArtworks, FALLBACK_ARTWORKS } from "@/lib/data/museum-layout";
import { getCountryBySlug, getCountryDisplayName, normalizeCountrySlug } from "@/lib/data/africa";
import { getI18n } from "@/lib/i18n/server";

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/[lang]/virtual-gallery">): Promise<Metadata> {
  const { t } = await getI18n(params);
  return {
    title: t("Virtual gallery"),
    description: t("Take your time with the work: a guided tour of the NUA-ARTE collection, one artwork at a time."),
  };
}

export default async function VirtualGalleryPage({ params, searchParams }: PageProps<"/[lang]/virtual-gallery">) {
  const { lang } = await getI18n(params);
  const country = (await searchParams).country;
  const countrySlug = typeof country === "string" ? country : undefined;

  const [published, blocks, hero] = await Promise.all([
    getPublishedArtworks(lang),
    getPageBlocks("virtual-gallery", lang),
    getSiteHero("virtual-gallery", lang),
  ]);

  // ?country=angola narrows the tour to that country's works when it has any.
  const inCountry = countrySlug
    ? published.filter((a) => normalizeCountrySlug(a.artistCountry ?? a.country ?? "") === countrySlug)
    : [];
  const source = inCountry.length > 0 ? inCountry : published;

  // Sample artworks only appear in local development (to work on the tour
  // before real works are published); a live site with nothing published
  // shows an empty state instead.
  const artworks =
    source.length > 0 ? layoutArtworks(source) : process.env.NODE_ENV === "development" ? FALLBACK_ARTWORKS : [];

  const roomTitles = Object.fromEntries(
    [1, 2, 3, 4].map((n) => [n, blocks[`room_title_${n}`]?.value?.trim() || ""]),
  ) as Record<1 | 2 | 3 | 4, string>;

  const countryLabel =
    inCountry.length > 0 && countrySlug && getCountryBySlug(countrySlug)
      ? getCountryDisplayName(countrySlug, lang)
      : null;

  return <VirtualGallery artworks={artworks} roomTitles={roomTitles} hero={hero} countryLabel={countryLabel} />;
}
