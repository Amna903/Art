import { AboutContent } from "./AboutContent";
import { SiteHeroBand } from "@/components/sections/SiteHeroBand";
import { getSiteHero } from "@/lib/data/site-heroes";
import { getRealArtists } from "@/lib/data/supabase-artists-cached";
import { ARTIST_COUNT, COUNTRY_COUNT } from "@/lib/data/artists";
import { getI18n } from "@/lib/i18n/server";
import { quoteFor } from "@/lib/data/quotes";

export const revalidate = 60;

export default async function AboutPage({ params }: PageProps<"/[lang]/about">) {
  const { lang, t } = await getI18n(params);
  const [hero, real] = await Promise.all([getSiteHero("about", lang), getRealArtists(lang)]);
  // Real figures (change brief §6); the static counts only on a build without data.
  const artists = real.length || ARTIST_COUNT;
  const countries = real.length ? new Set(real.map((a) => a.countrySlug).filter(Boolean)).size : COUNTRY_COUNT;
  return (
    <>
      <SiteHeroBand hero={hero} creditLabel={hero?.credit ? t("Artwork: {credit}", { credit: hero.credit }) : ""} />
      <AboutContent artists={artists} countries={countries} founderQuote={quoteFor("about")} />
    </>
  );
}
