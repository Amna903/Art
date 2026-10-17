import type { Metadata } from "next";
import { getExhibitions } from "@/lib/sanity/queries";
import { getPublishedExhibitions } from "@/lib/data/exhibitions";
import { getPageBlocks, blockText, blockImage } from "@/lib/data/pageBlocks";
import { getSiteHero } from "@/lib/data/site-heroes";
import { SiteHeroBand } from "@/components/sections/SiteHeroBand";
import { EditableText } from "@/components/editing/EditableText";
import { EditableImage } from "@/components/editing/EditableImage";
import { ExhibitionsGrid } from "@/components/editing/ExhibitionsGrid";
import { getI18n } from "@/lib/i18n/server";
import { formatDate } from "@/lib/i18n/translate";
import { INTL_LOCALES } from "@/lib/i18n/config";

export async function generateMetadata({ params }: PageProps<"/[lang]/exhibitions">): Promise<Metadata> {
  const { t } = await getI18n(params);
  return {
    title: t("Virtual & Global Exhibitions | NUA-ARTE"),
    description: t("NUA-ARTE — contemporary African art movement."),
  };
}

// Matches the 60s window the underlying Supabase/Sanity reads are cached at.
export const revalidate = 60;

const A = "https://nu-artcollective.lovable.app/__l5e/assets-v1";


export default async function ExhibitionsPage({ params }: PageProps<"/[lang]/exhibitions">) {
  const { lang, t } = await getI18n(params);
  const [supaExhibitions, cmsExhibitions, blocks, hero] = await Promise.all([
    getPublishedExhibitions(),
    getExhibitions(),
    getPageBlocks("exhibitions", lang),
    getSiteHero("exhibitions", lang),
  ]);

  const fallbackItems =
    cmsExhibitions.length > 0
      ? cmsExhibitions.map((e) => ({
          month: e.dateLabel ?? "",
          title: e.title,
          body: e.description ?? "",
          img: e.imageUrl ?? `${A}/2f15c99e-87ab-412d-88ad-ead477c66ef0/afr-artist-portrait.jpg`,
          alt: e.imageAlt ?? e.title,
        }))
      : [];

  // Unseen, Unheard — NYC Art Week 2026 (change brief §6). New block keys,
  // so earlier edits of the old sample feature do not override it; every
  // field stays editable inline by admins.
  const nycStart = new Date("2026-11-14T18:00:00-05:00");
  const nycEnd = new Date("2026-11-14T22:00:00-05:00");
  const nycDate = `${formatDate(nycStart, lang, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/New_York",
  })}, ${new Intl.DateTimeFormat(INTL_LOCALES[lang], { hour: "numeric", timeZone: "America/New_York" }).formatRange(nycStart, nycEnd)}`;
  const nycImg = blockImage(blocks, "nyc_image", {
    src: "/images/hero-unseen.jpg",
    alt: t("Close-up portrait of a face layered with red, ochre and ivory impasto paint."),
  });

  return (
    <main className="max-w-container-max mx-auto px-gutter-page">
      <SiteHeroBand hero={hero} creditLabel={hero?.credit ? t("Artwork: {credit}", { credit: hero.credit }) : ""} />
      <section className="mt-section-gap mb-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="max-w-2xl">
            <span className="font-label-caps text-label-caps text-secondary mb-4 block">{t("EXHIBITIONS PROGRAM")}</span>
            <h1 className="font-display-lg text-display-lg leading-none">
              <EditableText
                page="exhibitions"
                blockKey="hero_heading_line1"
                value={blockText(blocks, "hero_heading_line1", "Curation of")}
                as="span"
                multiline={false}
              />
              <br />
              <EditableText
                page="exhibitions"
                blockKey="hero_heading_line2"
                value={blockText(blocks, "hero_heading_line2", "Modern Spirit")}
                as="span"
                multiline={false}
              />
            </h1>
          </div>
          <div className="flex gap-8 border-b border-outline/20 pb-4">
            <button className="font-navigation text-navigation uppercase tracking-widest text-secondary border-b border-secondary pb-4 -mb-4.5">
              {t("Current")}
            </button>
            <button className="font-navigation text-navigation uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
              {t("Upcoming")}
            </button>
            <button className="font-navigation text-navigation uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
              {t("Past")}
            </button>
          </div>
        </div>
      </section>

      <section className="mb-section-gap">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-12">
          <div className="md:col-span-7">
            <EditableImage
              page="exhibitions"
              blockKey="nyc_image"
              bucket="exhibitions"
              src={nycImg.src}
              alt={nycImg.alt}
              className="w-full aspect-[4/3]"
            />
          </div>
          <div className="md:col-span-5">
            <EditableText
              page="exhibitions"
              blockKey="nyc_event"
              value={blockText(blocks, "nyc_event", "NYC Art Week 2026")}
              as="span"
              className="font-label-caps text-label-caps text-on-surface-variant block mb-3 uppercase"
              multiline={false}
            />
            <h2 translate="no" className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-[1] text-[var(--nua-red-poster)]">
              UNSEEN, UNHEARD
            </h2>
            <EditableText
              page="exhibitions"
              blockKey="nyc_description"
              value={blockText(blocks, "nyc_description", "The first NUA-ARTE exhibition in New York: works from the first collection, made in Luanda.")}
              as="p"
              className="mt-5 text-lg leading-[1.6] text-on-surface"
            />
            <dl className="mt-6 space-y-1 text-base text-on-surface-variant">
              <div>
                <dt className="sr-only">{t("Date")}</dt>
                <dd>
                  <EditableText page="exhibitions" blockKey="nyc_date" value={blockText(blocks, "nyc_date", nycDate)} as="span" multiline={false} />
                </dd>
              </div>
              <div>
                <dt className="sr-only">{t("Venue")}</dt>
                <dd>
                  <EditableText
                    page="exhibitions"
                    blockKey="nyc_venue"
                    value={blockText(blocks, "nyc_venue", "LeBain NYC, 444 West 13th Street, New York")}
                    as="span"
                    multiline={false}
                  />
                </dd>
              </div>
            </dl>
            <a
              href="https://nulumusic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary mt-8 inline-flex min-h-[48px] items-center px-8 text-base font-semibold"
            >
              {t("RSVP at nulumusic.com")}
            </a>
          </div>
        </div>
      </section>

      <section className="mb-section-gap">
        <div className="flex items-center gap-6 mb-12">
          <h2 className="font-headline-sm text-headline-sm">{t("Upcoming Calendars")}</h2>
          <div className="flex-grow h-px bg-primary/10" />
        </div>
        <ExhibitionsGrid initialItems={supaExhibitions} fallbackItems={fallbackItems} />
      </section>
    </main>
  );
}
