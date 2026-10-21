import { PriceUponRequest } from "@/components/enquiry/PriceUponRequest";
import { RequestPriceButton } from "@/components/enquiry/RequestPriceButton";
import { ZoomableImage } from "@/components/artwork/ZoomableImage";
import { SaveButton } from "@/components/artwork/SaveButton";
import { ShareButton } from "@/components/artwork/ShareButton";
import { CertificateButton } from "@/components/artwork/CertificateButton";
import { ReviewsSection } from "@/components/artwork/ReviewsSection";
import { getArtworkBySlug, getArtworksByArtistSlug } from "@/lib/sanity/queries";
import { getPublishedArtworkBySlug, getPublishedArtworks } from "@/lib/data/supabase-artists-cached";
import { ARTWORKS as STATIC_ARTWORKS } from "@/lib/data/content";
import { getArtistSlugByName } from "@/lib/data/artists";
import Link from "@/components/i18n/Link";
import Image from "next/image";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import type { Language } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translate";

export const revalidate = 60;

type Props = { params: Promise<{ lang: string; slug: string }> };

const FALLBACK = {
  title: "Ethereal Resilience",
  artist: "Adebayo Oluwaseun",
  medium: "Mixed Media on Canvas",
  year: "2024",
  image:
    "https://nu-artcollective.lovable.app/__l5e/assets-v1/dc981581-67cc-4c92-881e-bbb825d6b9c6/afr-street-lagos.jpg",
  imageAlt:
    "A large, stunning contemporary African oil painting featuring expressive, textured brushwork in a rich palette of deep earth tones and vibrant crimson. The artwork portrays a dignified figure in traditional yet modernized attire against a minimalist, light-mode gallery background.",
};

type RelatedWork = {
  slug: string;
  title: string;
  medium: string | null;
  image: string;
  imageAlt: string;
};

type ResolvedWork = {
  title: string;
  artist: string;
  artistSlug: string;
  medium: string;
  year: string;
  image: string;
  imageAlt: string;
  artistBio: string | null;
  artistStatement: string | null;
  relatedWorks: RelatedWork[];
  artistAvatar?: string | null;
  artistLocation?: string | null;
  artistTechnique?: string | null;
  dimensions?: string | null;
};

/**
 * Priority: Sanity CMS → real Supabase self-service artwork → static fixture
 * → generic editorial placeholder, so a slug from any source resolves to its
 * actual content instead of always rendering the same placeholder piece.
 */
async function resolveArtwork(slug: string, lang: Language, t: Translator): Promise<ResolvedWork> {
  const cms = await getArtworkBySlug(slug);
  if (cms) {
    return {
      title: cms.title,
      artist: cms.artistName ?? FALLBACK.artist,
      artistSlug: cms.artistSlug || getArtistSlugByName(cms.artistName ?? FALLBACK.artist),
      medium: cms.medium ?? FALLBACK.medium,
      year: cms.year ? String(cms.year) : FALLBACK.year,
      image: cms.imageUrl ?? FALLBACK.image,
      imageAlt: cms.imageAlt ?? FALLBACK.imageAlt,
      artistBio: cms.artistBio,
      artistStatement: cms.artistStatement,
      relatedWorks: cms.artistSlug
        ? (await getArtworksByArtistSlug(cms.artistSlug))
            .filter((work) => work.slug !== slug)
            .slice(0, 3)
            .map((work) => ({
              slug: work.slug,
              title: work.title,
              medium: work.medium,
              image: work.imageUrl ?? FALLBACK.image,
              imageAlt: work.imageAlt ?? work.title,
            }))
        : [],
    };
  }

  const real = await getPublishedArtworkBySlug(slug, lang);
  if (real) {
    return {
      title: real.title,
      artist: real.artistName,
      artistSlug: real.artistSlug || getArtistSlugByName(real.artistName),
      medium: real.medium ?? FALLBACK.medium,
      year: real.year ? String(real.year) : FALLBACK.year,
      image: real.imageUrl,
      imageAlt: t("{title} by {artist}", { title: real.title, artist: real.artistName }),
      artistBio: real.artistBio,
      // The work's own story, shown above the artist's bio.
      artistStatement: real.description?.trim() || null,
      artistAvatar: real.artistAvatarUrl,
      artistLocation: [real.artistCity, real.artistCountry].filter(Boolean).join(", ") || null,
      artistTechnique: real.artistTechnique,
      dimensions: real.dimensions,
      relatedWorks: (await getPublishedArtworks(lang))
        .filter((work) => work.artistId === real.artistId && work.slug !== slug)
        .slice(0, 3)
        .map((work) => ({
          slug: work.slug,
          title: work.title,
          medium: work.medium,
          image: work.imageUrl,
          imageAlt: t("{title} by {artist}", { title: work.title, artist: work.artistName }),
        })),
    };
  }

  const staticWork = STATIC_ARTWORKS.find((w) => w.slug === slug);
  if (staticWork) {
    return {
      title: staticWork.title,
      artist: staticWork.artist,
      artistSlug: getArtistSlugByName(staticWork.artist),
      medium: staticWork.medium,
      year: String(staticWork.year),
      image: staticWork.image,
      imageAlt: staticWork.title,
      artistBio: null,
      artistStatement: null,
      relatedWorks: STATIC_ARTWORKS.filter((work) => work.artist === staticWork.artist && work.slug !== slug)
        .slice(0, 3)
        .map((work) => ({
          slug: work.slug,
          title: work.title,
          medium: work.medium,
          image: work.image,
          imageAlt: work.title,
        })),
    };
  }

  return {
    ...FALLBACK,
    imageAlt: t(FALLBACK.imageAlt),
    artistSlug: "adebayo-oluwaseun",
    artistBio: null,
    artistStatement: null,
    relatedWorks: [],
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { lang, t } = await getI18n(params);
  const resolved = await resolveArtwork(slug, lang, t);
  return {
    title: `${resolved.title} | NUA-ARTE`,
    description: t("NUA-ARTE — contemporary African art movement."),
  };
}

export default async function ArtworkDetailPage({ params }: Props) {
  const { slug } = await params;
  const { lang, t } = await getI18n(params);
  const {
    title, artist, artistSlug, medium, year, image, imageAlt, artistBio, artistStatement, relatedWorks,
    artistAvatar, artistLocation, artistTechnique, dimensions,
  } = await resolveArtwork(slug, lang, t);

  return (
    <main className="max-w-container-max mx-auto px-gutter-page pt-24 md:pt-28">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        <div className="lg:col-span-7 flex flex-col gap-6 relative gallery-lighting p-4">
          <div className="relative">
            <ZoomableImage src={image} alt={imageAlt} />
            <SaveButton artworkSlug={slug} artworkTitle={title} artistName={artist} artworkImage={image} />
          </div>
          {relatedWorks.length > 0 && (
            <div className="flex gap-4">
              {relatedWorks.map((work) => (
                <Link
                  key={work.slug}
                  href={`/artworks/${work.slug}`}
                  className="relative block w-24 h-24 border border-outline/20 hover:border-secondary transition-colors"
                >
                  <Image fill sizes="96px" className="object-cover" alt={work.imageAlt} src={work.image} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 flex flex-col pt-4 lg:pt-0 sticky top-32">
          <nav className="flex gap-2 text-label-caps font-label-caps uppercase text-on-surface-variant mb-4">
            <a href="#">{t("Discover")}</a> / <a href="#">{t("Paintings")}</a>
          </nav>
          <h1 className="font-headline-md text-headline-md mb-2">{title}</h1>
          <div className="flex items-center gap-4 mb-8 red-thread thread-h">
            <Link
              href={`/artists/${artistSlug}`}
              className="font-body-lg text-body-lg text-secondary hover:underline transition-colors font-semibold"
            >
              {artist}
            </Link>
            {artistLocation && (
              <>
                <span className="text-on-surface-variant">•</span>
                <span className="font-label-caps text-label-caps uppercase tracking-widest">{artistLocation}</span>
              </>
            )}
          </div>

          {/* Artist card — the first thing a visitor sees after scanning a QR
              label (nua-arte.com/q/<id> redirects here): who made the work,
              where they come from, and a way into the rest of their work. */}
          {(artistBio || artistAvatar) && (
            <section className="mb-10 p-5 border border-outline/10 bg-surface-container-lowest">
              <p className="font-label-caps text-label-caps uppercase text-on-surface-variant mb-4">{t("About the artist")}</p>
              <div className="flex items-start gap-4">
                {artistAvatar && (
                  <div className="relative w-16 h-16 shrink-0 overflow-hidden bg-surface-container">
                    <Image src={artistAvatar} alt={artist} fill sizes="64px" className="object-cover" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-body-lg text-body-lg font-semibold">{artist}</p>
                  {artistLocation && <p className="text-sm text-on-surface-variant">{artistLocation}</p>}
                  {artistTechnique && <p className="text-sm text-on-surface-variant">{t(artistTechnique)}</p>}
                </div>
              </div>
              {artistBio && <p className="mt-4 text-base leading-relaxed line-clamp-6">{artistBio}</p>}
              <Link
                href={`/artists/${artistSlug}`}
                className="mt-5 inline-block w-full text-center border border-primary/20 py-3 font-navigation text-navigation uppercase tracking-widest hover:border-secondary hover:text-secondary transition-colors"
              >
                {t("Explore this artist’s artwork")}
              </Link>
            </section>
          )}

          <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-10 pb-10 border-b border-outline/10">
            <div>
              <p className="font-label-caps text-label-caps uppercase text-on-surface-variant mb-1">{t("Year")}</p>
              <p className="font-body-md text-body-md">{year}</p>
            </div>
            <div>
              <p className="font-label-caps text-label-caps uppercase text-on-surface-variant mb-1">{t("Medium")}</p>
              <p className="font-body-md text-body-md">{t(medium)}</p>
            </div>
            <div>
              <p className="font-label-caps text-label-caps uppercase text-on-surface-variant mb-1">{t("Dimensions")}</p>
              <p className="font-body-md text-body-md">{dimensions || "—"}</p>
            </div>
            <div>
              <p className="font-label-caps text-label-caps uppercase text-on-surface-variant mb-1">{t("Stock")}</p>
              <p className="font-body-md text-body-md text-secondary">{t("Unique Piece (1 available)")}</p>
            </div>
          </div>

          <div className="mb-10">
            <div className="mb-6">
              <PriceUponRequest className="font-headline-sm text-headline-sm" />
            </div>
            <div className="flex flex-col gap-4">
              <RequestPriceButton
                artworkSlug={slug}
                artworkTitle={title}
                artistName={artist}
                artworkImage={image}
                className="w-full bg-primary text-on-primary font-navigation text-navigation uppercase tracking-widest py-4 px-8 hover:bg-secondary transition-colors duration-300"
              >
                {t("Request Price")}
              </RequestPriceButton>
              <RequestPriceButton
                artworkSlug={slug}
                artworkTitle={title}
                artistName={artist}
                artworkImage={image}
                className="w-full flex items-center justify-center gap-2 font-navigation text-navigation uppercase tracking-widest py-4 border border-primary/20 hover:border-secondary hover:text-secondary transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">mail</span>
                {t("Inquire About Piece")}
              </RequestPriceButton>
            </div>

          </div>

          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-4 p-4 bg-surface-container-low border-l-2 border-secondary">
              <span className="material-symbols-outlined text-secondary">verified_user</span>
              <div>
                <p className="font-label-caps text-label-caps uppercase text-primary mb-1">{t("Collector Confidence")}</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {t("Includes a hand-signed Certificate of Authenticity. Insured global shipping in custom-built wooden crates.")}
                </p>
              </div>
            </div>
            <div className="flex gap-6 items-center">
              <ShareButton artworkTitle={title} artistName={artist} />
              <CertificateButton artworkTitle={title} artistName={artist} medium={t(medium)} year={year} />
            </div>
          </div>
        </div>
      </div>

      <div className="h-section-gap" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter pb-section-gap">
        <div className="lg:col-span-8 red-thread thread-v">
          <h3 className="font-label-caps text-label-caps uppercase text-on-surface-variant mb-6">
            {t("Artist Statement")}
          </h3>
          <p className="font-headline-sm text-headline-sm leading-snug mb-8">
            {artistStatement || artistBio || t("The artist has not shared a statement yet.")}
          </p>
          {artistBio && artistStatement && (
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{artistBio}</p>
          )}
        </div>
        <div className="lg:col-span-4 flex flex-col gap-8 bg-surface-container-lowest p-8 border border-outline/5">
          <ReviewsSection artworkSlug={slug} />
        </div>
      </div>
    </main>
  );
}
