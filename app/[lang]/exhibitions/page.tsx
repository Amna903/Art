import type { Metadata } from "next";
import { getExhibitions } from "@/lib/sanity/queries";
import { getPublishedExhibitions } from "@/lib/data/exhibitions";
import { getPageBlocks, blockText, blockImage } from "@/lib/data/pageBlocks";
import { getSiteHero } from "@/lib/data/site-heroes";
import { SiteHeroBand } from "@/components/sections/SiteHeroBand";
import { EditableText } from "@/components/editing/EditableText";
import { EditableImage } from "@/components/editing/EditableImage";
import { ExhibitionsGrid } from "@/components/editing/ExhibitionsGrid";
import { HostingEnquiryButton } from "@/components/enquiry/HostingEnquiryButton";
import Link from "@/components/i18n/Link";
import { getI18n } from "@/lib/i18n/server";
import { formatDate } from "@/lib/i18n/translate";
import { INTL_LOCALES } from "@/lib/i18n/config";

export async function generateMetadata({ params }: PageProps<"/[lang]/exhibitions">): Promise<Metadata> {
  const { t } = await getI18n(params);
  return {
    title: t("Exhibitions | NUA-ARTE"),
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
    // The official event poster (white version).
    src: "/images/nyc-art-week-2026-poster.jpg",
    alt: "NYC Art Week 2026 poster: NUA-ARTE Contemporary African Art Exhibition, curated by Anané Vega, Africa Liaison & Partner Nilton Viana. Saturday November 14, LeBain NYC, 444 West 13th Street, New York, NY 10014, 6 PM to 10 PM. RSVP at nulumusic.com.",
  });

  return (
    <main className="max-w-container-max mx-auto px-gutter-page">
      <SiteHeroBand hero={hero} creditLabel={hero?.credit ? t("Artwork: {credit}", { credit: hero.credit }) : ""} />
      <section className="mt-section-gap mb-20 max-w-3xl">
        <span className="font-label-caps text-label-caps text-secondary mb-4 block">{t("Exhibitions")}</span>
        <h1 translate="no" className="font-display text-[clamp(3rem,7vw,5.5rem)] uppercase leading-[0.95] text-[var(--nua-red-poster)]">
          UNSEEN, UNHEARD
        </h1>
        <p className="mt-4 font-display text-[clamp(1.5rem,2.6vw,2.1rem)]">{t("Art that invites you closer")}</p>
        <p className="mt-6 text-lg leading-[1.6] text-on-surface">
          {t("Encounter contemporary African art in person. See the texture, feel the scale and discover the people behind the work, in a shared space shaped by music and connection.")}
        </p>
      </section>

      <section className="mb-section-gap grid gap-10 border-t border-primary/10 pt-16 md:grid-cols-[1fr_1.4fr]">
        <h2 className="font-display text-3xl md:text-4xl">{t("The traveling experience")}</h2>
        <div className="max-w-2xl space-y-5 text-lg leading-[1.6] text-on-surface">
          <p>
            {t("Unseen, Unheard brings NUA-ARTE’s collection into physical spaces, allowing the feeling of discovery to unfold beyond a screen. A painted gaze, the grain of dyed sand or a gesture across a canvas may hold your attention. The artist’s story offers another way in.")}
          </p>
          <p>
            {t("Curated by Anané Vega, the experience brings together her worlds of visual art and music. Nulu Music provides the musical backdrop, continuing her work of creating spaces where artists can reach new audiences.")}
          </p>
          <p>
            {t("As the exhibition travels, the selection and musical experience can evolve with the venue and collection. The platform gives visitors a place to return to the works, continue learning and enquire about collecting.")}
          </p>
          <p className="font-display text-2xl">{t("A night of art, music, dance and culture.")}</p>
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
              className="w-full aspect-[4/5]"
              fit="contain"
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
            <h2 className="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05]">
              {t("NUA-ARTE Contemporary African Art Exhibition")}
            </h2>
            <p className="mt-3 text-base text-on-surface">
              {t("Curated by {curator}", { curator: "Anané Vega" })}
              <span className="block text-sm uppercase tracking-widest text-on-surface-variant">
                {t("Africa Liaison & Partner: {partner}", { partner: "Nilton Viana" })}
              </span>
            </p>
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
                    value={blockText(blocks, "nyc_venue", "LeBain NYC, 444 West 13th Street, New York, NY 10014")}
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

      <section id="upcoming" className="mb-section-gap scroll-mt-24">
        <div className="flex items-center gap-6 mb-12">
          <h2 className="font-headline-sm text-headline-sm">{t("Upcoming exhibitions")}</h2>
          <div className="flex-grow h-px bg-primary/10" />
        </div>
        <ExhibitionsGrid initialItems={supaExhibitions} fallbackItems={fallbackItems} />
      </section>

      <section className="mb-section-gap bg-[var(--nua-paper)] px-6 py-16 text-center md:px-16">
        <h2 className="font-display text-3xl md:text-4xl">{t("Invitation")}</h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-[1.6] text-on-surface">
          {t("Come with curiosity. Take your time. Let a work hold your attention, and meet the person whose imagination brought it into being.")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href="#upcoming" className="btn-secondary inline-flex min-h-[48px] items-center px-8 text-base">
            {t("View upcoming exhibitions")}
          </a>
          <Link href="/collections" className="btn-secondary inline-flex min-h-[48px] items-center px-8 text-base">
            {t("Explore the collection")}
          </Link>
        </div>
      </section>

      <section className="mb-section-gap grid gap-10 md:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-on-surface-variant">{t("For hosts")}</p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl">
            {t("Bring Unseen, Unheard to your space")}
          </h2>
        </div>
        <div className="max-w-2xl">
          <p className="text-lg leading-[1.6] text-on-surface">
            {t("We welcome conversations with venues and cultural partners interested in hosting an encounter with NUA-ARTE’s art, artists’ stories and music. Contact us to discuss the collection, the space and the experience we can create together.")}
          </p>
          <div className="mt-8">
            <HostingEnquiryButton />
          </div>
        </div>
      </section>
    </main>
  );
}
