import type { Metadata } from "next";
import { PriceUponRequest } from "@/components/enquiry/PriceUponRequest";
import { RequestPriceButton } from "@/components/enquiry/RequestPriceButton";
import { FollowArtistButton } from "@/components/artist/FollowArtistButton";
import { SaveArtistButton } from "@/components/artist/SaveArtistButton";
import { getArtistBySlug, getArtworksByArtistSlug } from "@/lib/sanity/queries";
import { getCountryBySlug, getCountryDisplayName } from "@/lib/data/africa";
import { getRealArtists, getPublishedArtworks } from "@/lib/data/supabase-artists-cached";
import { getArtistBySlug as getStaticArtistBySlug } from "@/lib/data/artists";
import { getDirectoryArtists } from "@/lib/data/directory";
import Link from "@/components/i18n/Link";
import Image from "next/image";
import { ArtistPhoto } from "@/components/artist/ArtistPhoto";
import { getI18n } from "@/lib/i18n/server";
import type { Language } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translate";

export const revalidate = 60;

type Props = { params: Promise<{ lang: string; slug: string }> };

type ArtistWork = {
  slug: string;
  title: string;
  medium: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
};

type ResolvedArtist = {
  artist: {
    name: string;
    slug: string;
    countryName: string | null;
    countrySlug: string | null;
    countryCode: string | null;
    city: string | null;
    technique: string | null;
    bio: string | null;
    featuredWork: string | null;
    imageUrl: string | null;
    imageAlt: string | null;
    worksCount: number | null;
    newDiscovery: boolean;
  };
  works: ArtistWork[];
  source: "sanity" | "supabase" | "static";
};

async function resolveArtist(slug: string, lang: Language, t: Translator): Promise<ResolvedArtist | null> {
  const cmsArtist = await getArtistBySlug(slug);
  if (cmsArtist) {
    return {
      artist: cmsArtist,
      works: (await getArtworksByArtistSlug(slug)).map((work) => ({
        slug: work.slug,
        title: work.title,
        medium: work.medium,
        imageUrl: work.imageUrl,
        imageAlt: work.imageAlt,
      })),
      source: "sanity" as const,
    };
  }

  const realArtist = (await getRealArtists(lang)).find((artist) => artist.slug === slug);
  if (realArtist) {
    const works = (await getPublishedArtworks(lang))
      .filter((work) => work.artistSlug === slug)
      .map((work) => ({
        slug: work.slug,
        title: work.title,
        medium: work.medium,
        imageUrl: work.imageUrl,
        imageAlt: (work as any).imageAlt ?? t("Artwork by {name}", { name: realArtist.name }),
      })) satisfies ArtistWork[];
    return {
      artist: {
        name: realArtist.name,
        slug: realArtist.slug,
        countryName: realArtist.countryName,
        countrySlug: realArtist.countrySlug,
        countryCode: realArtist.countryCode,
        city: realArtist.city,
        technique: realArtist.technique,
        bio: realArtist.bio,
        featuredWork: realArtist.featuredWork,
        imageUrl: realArtist.image,
        imageAlt: t("Portrait of {name}", { name: realArtist.name }),
        worksCount: realArtist.worksCount,
        newDiscovery: realArtist.newDiscovery,
      },
      works,
      source: "supabase" as const,
    };
  }

  const staticArtist = getStaticArtistBySlug(slug);
  if (staticArtist) {
    return {
      artist: {
        name: staticArtist.name,
        slug: staticArtist.slug,
        countryName: staticArtist.countryName,
        countrySlug: staticArtist.countrySlug,
        countryCode: staticArtist.countryCode,
        city: staticArtist.city,
        technique: staticArtist.technique,
        bio: t("{name} is part of the NUA-ARTE fixture directory.", { name: staticArtist.name }),
        featuredWork: staticArtist.featuredWork,
        imageUrl: staticArtist.image,
        imageAlt: t("Portrait of {name}", { name: staticArtist.name }),
        worksCount: 1,
        newDiscovery: false,
      },
      works: [],
      source: "static" as const,
    };
  }

  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { lang, t } = await getI18n(params);
  const resolved = await resolveArtist(slug, lang, t);
  return {
    title: t("Artist Profile — {name} | NUA-ARTE", { name: resolved?.artist.name ?? slug }),
    description: t(
      "NUA-ARTE — contemporary African art movement. Featured artist profile from the continent's new wave.",
    ),
  };
}

export default async function ArtistProfilePage({ params }: Props) {
  const { slug } = await params;
  const { lang, t } = await getI18n(params);
  const resolved = await resolveArtist(slug, lang, t);
  if (!resolved) {
    return <main className="max-w-container-max mx-auto px-gutter-page py-24">{t("Artist not found.")}</main>;
  }

  const { artist, works } = resolved;
  const directoryArtists = await getDirectoryArtists(lang);
  const country = artist.countrySlug ? getCountryBySlug(artist.countrySlug) : null;
  const heroImage =
    artist.imageUrl?.trim() ||
    "https://nu-artcollective.lovable.app/__l5e/assets-v1/dc981581-67cc-4c92-881e-bbb825d6b9c6/afr-street-lagos.jpg";
  const featuredWork = artist.featuredWork || works[0]?.title || t("Featured Work");
  const nameParts = artist.name.trim().split(/\s+/).filter(Boolean);
  const nameLead = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : artist.name;
  const nameTail = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  const workImageFor = (imageUrl: string | null | undefined) => imageUrl?.trim() || heroImage;

  const similarArtists = directoryArtists.filter(
    (a) =>
      a.slug !== artist.slug &&
      (a.countrySlug === artist.countrySlug || a.technique === artist.technique),
  )
    .sort((a, b) => Number(a.countrySlug !== artist.countrySlug) - Number(b.countrySlug !== artist.countrySlug))
    .slice(0, 4);

  return (
    <main>
      <section className="max-w-[1440px] mx-auto px-gutter-page grid grid-cols-12 gap-gutter relative">
        <div className="absolute top-1/3 left-0 w-full h-[1px] bg-secondary-container/20 -z-10 overflow-hidden">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-secondary-container to-transparent animate-[pan_10s_linear_infinite]" />
        </div>
        <div className="col-span-12 lg:col-span-7 relative group">
          <div className="relative overflow-hidden aspect-[4/5] rounded-xl shadow-2xl">
            <ArtistPhoto
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="object-cover transform scale-105 group-hover:scale-100 transition-transform duration-1000"
              name={artist.name}
              alt={artist.imageAlt ?? t("Portrait of {name}", { name: artist.name })}
              src={heroImage}
            />
            <div className="absolute bottom-8 left-8 glass-badge px-6 py-3 rounded-full flex items-center gap-3 border border-beige/50 shadow-xl group/badge">
              <span className="material-symbols-outlined text-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
                stars
              </span>
              <span className="text-label-caps text-tertiary">{artist.newDiscovery ? t("New Discovery") : t("Featured Artist")}</span>
              <div className="absolute bottom-full left-0 mb-4 opacity-0 group-hover/badge:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className="bg-tertiary text-on-tertiary text-xs p-3 rounded-lg shadow-2xl w-48">
                  <p className="font-semibold mb-1">{t("Discovered June 2026")}</p>
                  <p className="opacity-80">
                    {t("This artist has recently entered the NUA-ARTE curated network after a rigorous review in Dakar.")}
                  </p>
                  <div className="absolute top-full left-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-tertiary" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-12 lg:col-span-5 flex flex-col justify-center py-12 lg:pl-12">
          <div className="relative mb-8">
            <h4 className="text-label-caps text-secondary-container mb-4 editorial-line">
              {(artist.city || country?.capital || t("Unknown city")).toUpperCase()},{" "}
              {(getCountryDisplayName(country ?? artist.countryName, lang) || t("Unknown country")).toUpperCase()}
            </h4>
            <h1 className="text-display-lg leading-[0.9] text-tertiary mb-6">
              {nameLead}
              {nameTail ? (
                <>
                  <br />
                  <span className="italic font-normal">{nameTail}</span>
                </>
              ) : null}
            </h1>
            <div className="h-1 w-24 bg-tertiary mb-8" />
            <p className="text-body-lg text-on-surface-variant max-w-md leading-relaxed mb-8 italic">
              “{artist.bio || t("A contemporary practice rooted in {place}.", { place: getCountryDisplayName(country ?? artist.countryName, lang) || t("Africa") })}”
            </p>
            <p className="text-body-md font-semibold text-tertiary uppercase tracking-widest">
              {t("Featured work:")}{" "}{featuredWork}
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <p className="text-body-md font-semibold text-tertiary uppercase tracking-widest">{t("Medium:")}{" "}{t(artist.technique || "Mixed Media")}</p>
            <div className="flex items-center gap-4 mt-4">
              <FollowArtistButton
                artistSlug={artist.slug}
                artistName={artist.name}
                artistImage={heroImage}
                technique={artist.technique}
                countryName={artist.countryName}
              />
              <SaveArtistButton
                artistSlug={artist.slug}
                artistName={artist.name}
                artistImage={heroImage}
                technique={artist.technique}
                countryName={artist.countryName}
              />
            </div>
            <p className="text-xs text-on-surface-variant italic mt-2 opacity-0 transition-opacity">
              {t("Login required to sync to collection")}
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-[1440px] mx-auto px-gutter-page mt-section-gap grid grid-cols-12 gap-gutter">
        <div className="col-span-12 lg:col-span-4">
          <h2 className="text-headline-sm font-display mb-6 border-b border-outline-variant pb-4">{t("The Narrative")}</h2>
        </div>
        <div className="col-span-12 lg:col-span-8">
          <div className="prose prose-lg text-body-lg text-on-surface-variant leading-relaxed columns-1 md:columns-2 gap-12">
            <p className="mb-6 first-letter:text-5xl first-letter:font-display first-letter:float-left first-letter:mr-3 first-letter:text-secondary-container">
              {artist.bio || t("{name} works across contemporary African visual culture.", { name: artist.name })}
            </p>
            <p className="mb-6">
              {artist.featuredWork
                ? t("Featured work: {featuredWork}.", { featuredWork: artist.featuredWork })
                : t("This artist profile is sourced from Sanity and will expand as more studio notes are added.")}
            </p>
            <div className="mt-8">
              <button className="inline-flex items-center gap-4 bg-surface-container-high hover:bg-secondary-container hover:text-on-secondary-container px-6 py-4 rounded-full transition-all group">
                <span
                  className="material-symbols-outlined text-secondary-container group-hover:text-on-secondary-container"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  play_circle
                </span>
                <span className="text-label-caps">{t("Watch: Studio Walkthrough")}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-[1440px] mx-auto px-gutter-page mt-section-gap">
        <div className="flex justify-between items-end mb-12 border-b border-outline-variant pb-6">
          <div>
            <h4 className="text-label-caps text-secondary-container mb-2">{t("CURATED COLLECTION")}</h4>
            <h2 className="text-headline-md font-display">{t("Available Works")}</h2>
          </div>
          <a className="text-navigation font-bold uppercase tracking-widest border-b-2 border-tertiary" href="#">
            {t("View All")}
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {works.map((w) => (
            <div key={w.slug} className="group hover-lift">
              <Link href={`/artworks/${w.slug}`} className="block">
                <div className="relative aspect-square overflow-hidden rounded-lg mb-6 bg-surface-container">
                  <Image
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    alt={w.imageAlt ?? w.title}
                    src={workImageFor(w.imageUrl)}
                  />
                  <div className="absolute inset-0 bg-tertiary/0 group-hover:bg-tertiary/10 transition-colors" />
                </div>
                <h3 className="text-body-lg font-bold">{w.title}</h3>
                <p className="text-on-surface-variant">{t(w.medium ?? "Mixed media")}</p>
              </Link>
              <div className="flex justify-between items-center gap-4 mt-1">
                <PriceUponRequest className="text-sm" />
                <RequestPriceButton
                  artworkSlug={w.slug}
                  artworkTitle={w.title}
                  artistName={artist.name}
                  artworkImage={workImageFor(w.imageUrl)}
                  className="shrink-0 bg-tertiary text-on-tertiary px-4 py-2 font-label-caps text-[10px] uppercase tracking-widest hover:bg-secondary transition-colors"
                >
                  {t("Request Price")}
                </RequestPriceButton>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-[1440px] mx-auto px-gutter-page mt-section-gap bg-surface-container-low py-20 rounded-3xl">
        <div className="px-12">
          <div className="mb-12">
            <h4 className="text-label-caps text-on-surface-variant mb-2">{t("PROVENANCE")}</h4>
            <h2 className="text-headline-sm font-display italic">{t("Previously Collected")}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 transition-all duration-500">
            {(works.slice(0, 4).length > 0 ? works.slice(0, 4) : []).map((work, i) => (
              <div key={i} className="relative aspect-square rounded bg-surface-container-highest overflow-hidden">
                <Image
                  fill
                  sizes="(max-width: 768px) 50vw, 20vw"
                  className="object-cover"
                  alt={work.imageAlt ?? work.title}
                  src={workImageFor(work.imageUrl)}
                />
              </div>
            ))}
          </div>
          <div className="mt-12 flex items-center gap-2">
            <span className="size-2 rounded-full bg-secondary-container animate-pulse" />
            <p className="text-label-caps text-on-surface-variant uppercase">
              {t("Highly sought after: {count} works placed in the archive", { count: works.length })}
            </p>
          </div>
        </div>
      </section>

      {similarArtists.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-gutter-page mt-section-gap">
          <div className="flex justify-between items-end mb-12 border-b border-outline-variant pb-6">
            <div>
              <h4 className="text-label-caps text-secondary-container mb-2">{t("DISCOVER MORE")}</h4>
              <h2 className="text-headline-md font-display">{t("Similar Artists")}</h2>
            </div>
            <Link
              href="/artists"
              className="text-navigation font-bold uppercase tracking-widest border-b-2 border-tertiary"
            >
              {t("View All")}
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {similarArtists.map((a) => (
              <Link key={a.slug} href={`/artists/${a.slug}`} className="group">
                <div className="relative aspect-square overflow-hidden rounded-lg mb-4 bg-surface-container">
                  <ArtistPhoto
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    name={a.name}
                    alt={t("Portrait of {name}", { name: a.name })}
                    src={a.image}
                  />
                </div>
                <h3 className="text-body-lg font-bold group-hover:text-secondary transition-colors">{a.name}</h3>
                <p className="text-on-surface-variant text-sm italic">
                  {[a.city, getCountryDisplayName(a.countryName || a.countrySlug, lang)].filter(Boolean).join(", ")}
                </p>
                <p className="text-secondary text-xs uppercase tracking-widest mt-1">{t(a.technique)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

    </main>
  );
}
