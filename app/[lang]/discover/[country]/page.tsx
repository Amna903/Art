// /discover/:country — rich, editorial destination page for each of the 54
// African countries. Reached from the homepage Africa atlas map.
import Link from "@/components/i18n/Link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  AFRICAN_COUNTRIES,
  getCountryBySlug,
  getCountryDisplayName,
  mockArtistBio,
  mockArtworkDescription,
  regionLabel,
  type MockArtist,
  type MockArtwork,
} from "@/lib/data/africa";
import { getI18n } from "@/lib/i18n/server";
import { localizeRow } from "@/lib/i18n/content";
import { pickImage } from "@/lib/data/african-imagery";
import { getCountryGalleryBySlug } from "@/lib/sanity/queries";
import { getRealArtists, getPublishedArtworks } from "@/lib/data/supabase-artists-cached";
import { getPublishedJournalPosts } from "@/lib/data/journal";
import { JOURNAL_FALLBACK_STORIES } from "@/lib/data/journal-fallback";
import { getPublishedExhibitions } from "@/lib/data/exhibitions";
import { mergeSlots } from "@/lib/utils/mergeSlots";
import { CuratedWorksGrid, type CuratedWork } from "@/components/sections/discover/CuratedWorksGrid";
import { formatDate } from "@/lib/i18n/translate";

type Props = { params: Promise<{ lang: string; country: string }> };

// Pre-render all 54 country pages at build time; ISR regenerates each one in
// the background at most once every 60s (matching the data layer's own
// unstable_cache window), instead of every visit doing a full server-side
// fan-out to Supabase + Sanity.
export function generateStaticParams() {
  return AFRICAN_COUNTRIES.map((c) => ({ country: c.slug }));
}

export const revalidate = 60;

const SWATCH_PALETTE = ["b8703a", "c9a24a", "a37542", "d6b078", "8a5a2c", "7a4a2a", "8a8248", "96806a"];
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function swatchFor(seed: string): string {
  return SWATCH_PALETTE[hashStr(seed) % SWATCH_PALETTE.length];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country: countrySlug } = await params;
  const { lang, t } = await getI18n(params);
  const c = getCountryBySlug(countrySlug);
  const name = c ? getCountryDisplayName(c, lang) : countrySlug;
  const desc = t(c?.blurb ?? "A country spotlight from the NUA-ARTE atlas.");
  const hero = pickImage(`hero-${countrySlug}`, "hero");
  return {
    title: t("{name} — Country Experience | NUA-ARTE", { name }),
    description: desc,
    openGraph: {
      title: t("{name} — NUA-ARTE Country Experience", { name }),
      description: desc,
      images: [hero],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function CountryExperience({ params }: Props) {
  const { country: countrySlug } = await params;
  const { lang, t } = await getI18n(params);
  const country = getCountryBySlug(countrySlug);
  if (!country) notFound();
  // Display names for this language; `country.name` stays the English key
  // that real rows are matched on.
  const name = getCountryDisplayName(country, lang);
  const region = regionLabel(country.region, t);
  const [gallery, realArtistsAll, realArtworksAll, allJournalPosts, allExhibitions] = await Promise.all([
    getCountryGalleryBySlug(countrySlug),
    getRealArtists(lang),
    getPublishedArtworks(lang),
    getPublishedJournalPosts(),
    getPublishedExhibitions(),
  ]);
  if (!gallery) notFound();

  // Real, self-service artists/artworks from this country take over the
  // gallery's static slots one-for-one — same exchange as the Collections
  // page — the rest stay mock/CMS content until replaced.
  const countryNameLower = country.name.toLowerCase();
  const realCountryArtists: MockArtist[] = realArtistsAll
    .filter((a) => (a.countryName || "").toLowerCase() === countryNameLower)
    .map((a) => ({
      slug: a.slug,
      name: a.name,
      role: "emerging",
      bio: a.bio || mockArtistBio(a.name, country, t),
      avatarSwatch: swatchFor(a.slug),
      image: a.image || undefined,
    }));
  const realCountryArtworks: MockArtwork[] = realArtworksAll
    .filter((a) => (a.country || "").toLowerCase() === countryNameLower)
    .map((a, i) => ({
      id: a.slug,
      title: a.title,
      artist: a.artistName,
      artistSlug: a.artistId,
      year: a.year ?? new Date().getFullYear(),
      technique: a.medium || "Mixed Media",
      dimensions: t("Dimensions on request"),
      price: 1, // published real artworks are always inquirable; the real $ is never exposed (Price Upon Request)
      city: country.capital,
      description:
        a.description ||
        t("A work from {country} that folds inherited symbols into a contemporary register.", { country: name }),
      swatch: swatchFor(a.slug),
      room: (i % 3) as 0 | 1 | 2,
      image: a.imageUrl,
    }));

  // Generated placeholder copy is re-rendered in this language.
  const galleryArtists = gallery.artists.map((a) =>
    a.bio === mockArtistBio(a.name, country) ? { ...a, bio: mockArtistBio(a.name, country, t) } : a,
  );
  const galleryArtworks = gallery.artworks.map((w) =>
    w.description === mockArtworkDescription(country) ? { ...w, description: mockArtworkDescription(country, lang, t) } : w,
  );
  const mergedArtists = mergeSlots(realCountryArtists, galleryArtists).map((a, i) => ({
    ...a,
    role: (i === 0 ? "featured" : "emerging") as MockArtist["role"],
  }));
  const mergedArtworks = mergeSlots(realCountryArtworks, galleryArtworks);

  const stats = {
    artistsCount: mergedArtists.length,
    worksCount: mergedArtworks.length,
    forSale: mergedArtworks.filter((w) => w.price !== null).length,
  };

  // Neighbour navigation across the canonical 54-country list.
  const idx = AFRICAN_COUNTRIES.findIndex((c) => c.slug === country.slug);
  const prev = AFRICAN_COUNTRIES[(idx - 1 + AFRICAN_COUNTRIES.length) % AFRICAN_COUNTRIES.length];
  const next = AFRICAN_COUNTRIES[(idx + 1) % AFRICAN_COUNTRIES.length];

  const featuredArtist = mergedArtists.find((a: MockArtist) => a.role === "featured") ?? mergedArtists[0];
  const supportingArtists = mergedArtists.filter((a: MockArtist) => a.slug !== featuredArtist?.slug).slice(0, 3);
  const curatedWorks: CuratedWork[] = mergedArtworks.map((w: MockArtwork) => ({
    id: w.id,
    title: w.title,
    artist: w.artist,
    year: w.year,
    technique: w.technique,
    dimensions: w.dimensions,
    price: w.price,
    swatch: w.swatch,
    image: w.image ?? pickImage(`work-${w.id}`, "artwork"),
  }));


  const heroImg = pickImage(`hero-${country.slug}`, "hero");
  const editorialImg = pickImage(`edit-${country.slug}`, "editorial");

  // Real journal posts tagged with this country take over the mock editorial
  // slots one-for-one — same exchange as everywhere else — the rest stay
  // mock until an admin tags a post with this country.
  const realCountryStories = allJournalPosts
    .filter((p) => (p.country || "").toLowerCase() === countryNameLower)
    .map((p) => localizeRow(p, ["title", "excerpt"], lang))
    .map((p) => ({
      kicker: `${t(p.category).toUpperCase()} · ${name.toUpperCase()}`,
      title: p.title,
      excerpt: p.excerpt ?? "",
      img: p.cover_image_url || pickImage(`story-${p.slug}`, "editorial"),
      slug: p.slug as string | undefined,
    }));
  // Every mock story points at one of the three real demo journal articles
  // (not a bare "/journal" listing link), so "Read Article" always opens an
  // actual, distinct post rather than the same generic destination.
  const mockStories = [
    {
      kicker: t("STORIES FROM {country}", { country: name.toUpperCase() }),
      title: t("A studio afternoon in {capital}", { capital: country.capital }),
      excerpt: t(
        "Inside the studios shaping {country}'s new visual grammar — where inherited symbols meet a contemporary register.",
        { country: name },
      ),
      img: pickImage(`story1-${country.slug}`, "editorial"),
      slug: JOURNAL_FALLBACK_STORIES[0]?.slug as string | undefined,
    },
    {
      kicker: t("VOICES FROM {country}", { country: name.toUpperCase() }),
      title: t("{artist} on process and place", { artist: featuredArtist?.name ?? t("An artist") }),
      excerpt: `${t(country.blurb)} ${t("A conversation on lineage, material, and the pull of the {region} horizon.", { region })}`,
      img: pickImage(`story2-${country.slug}`, "editorial"),
      slug: JOURNAL_FALLBACK_STORIES[1]?.slug as string | undefined,
    },
    {
      kicker: t("NEW PERSPECTIVES FROM {country}", { country: name.toUpperCase() }),
      title: t("Emerging voices around {capital}", { capital: country.capital }),
      excerpt: t(
        "Curatorial notes on the emerging generation reframing {country}'s cultural output for a global audience.",
        { country: name },
      ),
      img: pickImage(`story3-${country.slug}`, "editorial"),
      slug: JOURNAL_FALLBACK_STORIES[2]?.slug as string | undefined,
    },
  ];
  const stories = mergeSlots(realCountryStories, mockStories);

  // Real exhibitions tagged with this country take over the mock programme
  // slots one-for-one — same exchange as artworks and stories above — the
  // rest stay mock until an admin tags an exhibition with this country.
  const realCountryExhibitions = allExhibitions
    .filter((e) => (e.country || "").toLowerCase() === countryNameLower)
    .map((e) => localizeRow(e, ["title", "location", "date_label"], lang))
    .map((e) => ({
      title: e.title,
      venue: e.location || t("NUA-ARTE Pavilion · {capital}", { capital: country.capital }),
      dates: e.date_label || t(e.status === "current" ? "Ongoing" : e.status === "upcoming" ? "Upcoming" : "Past"),
      img: e.cover_image_url || pickImage(`exh-${e.slug}`, "gallery"),
    }));
  const mockExhibitions = [
    {
      title: t("Threads of {country}", { country: name }),
      venue: t("NUA-ARTE Pavilion · {capital}", { capital: country.capital }),
      dates: `${t("Ongoing")} — ${formatDate("2027-03-01", lang, { month: "long", year: "numeric" })}`,
      img: pickImage(`exh1-${country.slug}`, "gallery"),
    },
    {
      title: t("{region} Currents", { region }),
      venue: t("Group show · touring {region}", { region }),
      dates: `${formatDate("2026-09-01", lang, { month: "short", year: "numeric" })} — ${formatDate("2027-01-01", lang, { month: "short", year: "numeric" })}`,
      img: pickImage(`exh2-${country.slug}`, "gallery"),
    },
  ];
  const exhibitions = mergeSlots(realCountryExhibitions, mockExhibitions);

  return (
    <main className="bg-background text-foreground">
      {/* ============================== HERO ============================== */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={heroImg}
            alt={t("Editorial hero image evoking contemporary art from {name}", { name })}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-background" />
        </div>

        <div className="relative max-w-container-max mx-auto px-gutter-page pt-24 md:pt-32 pb-24 md:pb-40 text-[#FFFFFF]">
          <Link
            href="/#atlas"
            className="inline-flex items-center gap-2 font-label-caps tracking-widest text-[#FFFFFF]/80 hover:text-[#FFFFFF] transition-colors"
          >
            {t("← BACK TO AFRICA MAP")}
          </Link>

          <div className="mt-10 flex items-center gap-4">
            <span className="text-5xl" aria-hidden>{country.flag}</span>
            <span className="font-label-caps tracking-widest text-[#FFFFFF]/80">
              {region.toUpperCase()} · {country.capital.toUpperCase()}
            </span>
          </div>

          <h1 className="font-display text-6xl md:text-8xl mt-4 leading-[0.95]">
            {name}
          </h1>

          <div className="mt-6 max-w-2xl">
            <div className="red-thread w-24 mb-6" />
            <p className="font-body-lg text-lg md:text-xl leading-relaxed text-[#FFFFFF]/90">
              {t(country.blurb)}
            </p>
            <p className="mt-4 text-[#FFFFFF]/70 font-body-md">
              {t(
                "An editorial gateway into the artists, works, and stories that define {country}'s contribution to the contemporary African movement — assembled with curatorial care by NUA-ARTE.",
                { country: name },
              )}
            </p>
          </div>

          <dl className="mt-12 grid grid-cols-3 max-w-md gap-6">
            <Stat label={t("Artists")} value={stats.artistsCount} />
            <Stat label={t("Works")} value={stats.worksCount} />
            <Stat label={t("For sale")} value={stats.forSale} />
          </dl>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href={`/virtual-gallery?country=${country.slug}`}
              className="bg-[#D7141E] text-[#FFFFFF] px-7 py-3 font-label-caps tracking-widest hover:bg-[#B0000E] transition-colors"
            >
              {t("ENTER VIRTUAL GALLERY →")}
            </Link>

            <Link
              href={`/artists?country=${country.slug}`}
              className="border border-[#FFFFFF]/60 text-[#FFFFFF] px-7 py-3 font-label-caps tracking-widest hover:bg-[#FFFFFF] hover:text-[#111111] transition-colors"
            >
              {t("VIEW ARTISTS ({count})", { count: stats.artistsCount })}
            </Link>
          </div>

        </div>
      </section>

      {/* ========================= FEATURED ARTIST ========================= */}
      {featuredArtist && (
        <section className="max-w-container-max mx-auto px-gutter-page py-20 md:py-28">
          <SectionKicker>{t("FEATURED ARTIST")}</SectionKicker>

          <div className="grid md:grid-cols-[1.1fr_1fr] gap-10 md:gap-16 items-center">
            <div className="relative h-[520px] md:h-[640px]">
              <Image
                src={featuredArtist.image ?? pickImage(`artist-${country.slug}-${featuredArtist.slug}`, "portrait")}
                alt={t("Portrait of {name}", { name: featuredArtist.name })}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
              <div
                className="absolute -bottom-4 -right-4 w-24 h-24"
                style={{ background: `#${featuredArtist.avatarSwatch}` }}
                aria-hidden
              />
            </div>

            <div>
              <h2 className="font-display text-5xl md:text-6xl text-primary leading-[1.02]">
                {featuredArtist.name}
              </h2>
              <p className="mt-3 font-label-caps tracking-widest text-secondary">
                {country.capital.toUpperCase()} · {name.toUpperCase()}
              </p>
              <div className="red-thread w-16 my-6" />
              <p className="font-body-lg text-lg text-on-surface-variant leading-relaxed max-w-xl">
                {featuredArtist.bio}{" "}
                {t(
                  "Working across painting, sculpture and mixed media, {first}'s practice is a cornerstone of NUA-ARTE's programme for {country}.",
                  { first: featuredArtist.name.split(" ")[0], country: name },
                )}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={`/artists?country=${country.slug}`}
                  className="bg-primary text-beige px-6 py-3 font-label-caps tracking-widest hover:bg-red-blood transition-colors"
                >
                  {t("VIEW ARTIST →")}
                </Link>
              </div>

              {supportingArtists.length > 0 && (
                <div className="mt-12">
                  <p className="font-label-caps tracking-widest text-on-surface-variant mb-4">
                    {t("ALSO FROM {country}", { country: name.toUpperCase() })}
                  </p>
                  <ul className="divide-y divide-outline/40 border-t border-b border-outline/40">
                    {supportingArtists.map((a: MockArtist) => (
                      <li
                        key={a.slug}
                        className="flex items-center justify-between py-4"
                      >
                        <div>
                          <p className="font-headline-sm text-primary">{a.name}</p>
                          <p className="text-sm text-on-surface-variant italic">
                            {country.capital}, {name}
                          </p>
                        </div>
                        <span className="font-label-caps tracking-widest text-secondary">
                          {a.role === "featured" ? t("FEATURED") : t("EMERGING")} →
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ============================ ARTWORKS ============================ */}
      <section className="bg-surface-container-low/50 border-y border-outline/30">
        <div className="max-w-container-max mx-auto px-gutter-page py-20 md:py-28">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
            <div>
              <SectionKicker>{t("CURATED WORKS")}</SectionKicker>
              <h2 className="font-display text-4xl md:text-5xl text-primary">
                {t("Available from {country}", { country: name })}
              </h2>
            </div>
            <Link
              href="/collections"
              className="font-label-caps tracking-widest text-secondary hover:text-primary border-b border-secondary/40 hover:border-primary pb-1"
            >
              {t("VIEW ENTIRE COLLECTION →")}
            </Link>
          </div>

          <CuratedWorksGrid works={curatedWorks} />
        </div>
      </section>

      {/* ============================ STORIES ============================ */}
      <section className="max-w-container-max mx-auto px-gutter-page py-20 md:py-28">
        <div className="grid md:grid-cols-[1fr_2fr] gap-10 md:gap-16 mb-14 items-end">
          <div>
            <SectionKicker>{t("EDITORIAL")}</SectionKicker>
            <h2 className="font-display text-4xl md:text-5xl text-primary">
              {t("Stories from {country}", { country: name })}
            </h2>
          </div>
          <div className="relative w-full max-w-xl h-56">
            <Image
              src={editorialImg}
              alt={t("Editorial image from {name}", { name })}
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {stories.map((s, i) => (
            <article key={i} className="group flex flex-col">
              <div className="relative aspect-[4/3] overflow-hidden mb-5">
                <Image
                  src={s.img}
                  alt={s.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <p className="font-label-caps tracking-widest text-secondary text-xs mb-2">
                {s.kicker}
              </p>
              <h3 className="font-headline-sm text-primary group-hover:text-secondary transition-colors">
                {s.title}
              </h3>
              <p className="text-on-surface-variant mt-3 leading-relaxed">
                {s.excerpt}
              </p>
              <Link
                href={s.slug ? `/journal/${s.slug}` : "/journal"}
                className="mt-4 font-label-caps tracking-widest text-primary border-b border-primary self-start"
              >
                {t("READ ARTICLE →")}
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* ========================== EXHIBITIONS ========================== */}
      <section className="bg-surface-container-low/50 border-y border-outline/30">
        <div className="max-w-container-max mx-auto px-gutter-page py-20 md:py-28">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
            <div>
              <SectionKicker>{t("PROGRAMME")}</SectionKicker>
              <h2 className="font-display text-4xl md:text-5xl text-primary">
                {t("Exhibitions linked to {country}", { country: name })}
              </h2>
            </div>
            <Link
              href="/exhibitions"
              className="font-label-caps tracking-widest text-secondary hover:text-primary border-b border-secondary/40 hover:border-primary pb-1"
            >
              {t("ALL EXHIBITIONS →")}
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {exhibitions.map((e, i) => (
              <article key={i} className="group">
                <div className="relative aspect-[3/2] overflow-hidden mb-5">
                  <Image
                    src={e.img}
                    alt={e.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-[#FFFFFF]">
                    <p className="font-label-caps tracking-widest text-xs opacity-80">
                      {e.dates}
                    </p>
                    <h3 className="font-display text-3xl mt-1">{e.title}</h3>
                    <p className="italic text-[#FFFFFF]/90 mt-1">{e.venue}</p>

                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ======================== VIRTUAL GALLERY ======================== */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={pickImage(`vg-${country.slug}`, "gallery")}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-primary/85" />
        </div>
        <div className="relative max-w-container-max mx-auto px-gutter-page py-24 md:py-32 text-beige">
          <SectionKicker className="text-beige/80">{t("IMMERSIVE MODE")}</SectionKicker>
          <div className="grid md:grid-cols-[2fr_1fr] gap-10 items-end">
            <h2 className="font-display text-5xl md:text-7xl leading-[0.95]">
              {t("Step inside the {country} pavilion.", { country: name })}
            </h2>
            <p className="text-beige/85 font-body-lg max-w-md">
              {t(
                "A curated, room-by-room virtual walk through the featured artist, emerging voices, and available works from {country}.",
                { country: name },
              )}
            </p>
          </div>
          <div className="mt-10">
            <Link
              href={`/virtual-gallery?country=${country.slug}`}
              className="inline-block bg-beige text-primary px-8 py-4 font-label-caps tracking-widest hover:opacity-90 transition-opacity"
            >
              {t("ENTER VIRTUAL GALLERY →")}
            </Link>

          </div>
        </div>
      </section>

      {/* ============================ NAV FOOTER ============================ */}
      <section className="max-w-container-max mx-auto px-gutter-page py-20">
        <div className="red-thread w-full mb-10" />
        <div className="grid md:grid-cols-3 gap-8 items-center">
          <Link
            href={`/discover/${prev.slug}`}
            className="group"
          >
            <p className="font-label-caps tracking-widest text-secondary text-xs mb-2">
              {t("← PREVIOUS COUNTRY")}
            </p>
            <p className="font-display text-3xl text-primary group-hover:text-secondary transition-colors">
              {prev.flag} {getCountryDisplayName(prev, lang)}
            </p>
          </Link>

          <div className="text-center">
            <Link
              href="/#atlas"
              className="inline-block border border-primary px-6 py-3 font-label-caps tracking-widest hover:bg-primary hover:text-beige transition-colors"
            >
              {t("BACK TO AFRICA MAP")}
            </Link>
          </div>

          <Link
            href={`/discover/${next.slug}`}
            className="group md:text-right"
          >
            <p className="font-label-caps tracking-widest text-secondary text-xs mb-2">
              {t("CONTINUE EXPLORING →")}
            </p>
            <p className="font-display text-3xl text-primary group-hover:text-secondary transition-colors">
              {getCountryDisplayName(next, lang)} {next.flag}
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-display text-4xl">{value}</div>
      <div className="font-label-caps tracking-widest text-xs opacity-80 mt-1">
        {label.toUpperCase()}
      </div>
    </div>
  );
}

function SectionKicker({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 mb-4 ${className}`}>
      <span className="w-8 h-[1px] bg-secondary" />
      <span className="font-label-caps tracking-widest text-secondary text-xs">
        {children}
      </span>
    </div>
  );
}
