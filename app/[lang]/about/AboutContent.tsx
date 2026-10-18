"use client";

import Link from "@/components/i18n/Link";
import { useLanguage } from "@/lib/i18n";
import { QuoteBlock } from "@/components/sections/QuoteBlock";
import type { Quote } from "@/lib/data/quotes";

/** About page copy from "NUA ARTE website copy and editorial direction"
 * (9 Oct 2026). Figures are the real counts passed in by the page. */
export function AboutContent({
  artists,
  countries,
  founderQuote,
}: {
  artists: number;
  countries: number;
  founderQuote?: Quote;
}) {
  const { t } = useLanguage();

  return (
    <main>
      <section className="max-w-container-max mx-auto px-gutter-page pt-16 pb-20 md:pt-24">
        <h1 className="font-display text-[clamp(2.5rem,5.5vw,4.5rem)] leading-[1.05] max-w-3xl">
          {t("A work of art. A moment of connection. A beginning.")}
        </h1>
        <p className="mt-8 max-w-2xl text-lg leading-[1.6] text-on-surface-variant">
          {t("NUA-ARTE grew from the feeling of encountering something beautiful, then discovering a life and a creative voice behind it.")}
        </p>
      </section>

      <section className="bg-surface-container-low">
        <div className={`max-w-container-max mx-auto px-gutter-page py-20 grid gap-12 ${founderQuote ? "lg:grid-cols-[1.2fr_1fr] lg:items-center" : ""}`}>
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl md:text-4xl mb-8">{t("A note from Anané")}</h2>
            <div className="space-y-5 text-lg leading-[1.6] text-on-surface">
              <p>
                {t("When I travel for music, I often look for art to bring home. During a visit to Luanda, I asked to be taken to the art market. I went to collect, drawn by the works that made me stop and feel something.")}
              </p>
              <p>
                {t("I purchased twenty pieces, imagining them in my homes, living with them and moving them from one space to another. I had no idea they would become the beginning of a platform.")}
              </p>
              <p>
                {t("After I returned home, Nilton approached me about a collaboration. We began learning more about the people behind the work. Some of the paintings I had felt most connected to carried stories I had not known when I chose them. That discovery deepened everything.")}
              </p>
              <p>
                {t("I wanted to share that feeling: the first spark of connection, followed by the curiosity to know more. NUA-ARTE is the space we are building for it.")}
              </p>
            </div>
            <p className="mt-8">
              <span className="block font-semibold" translate="no">Anané Vega</span>
              <span className="block text-sm text-on-surface-variant">{t("Founder and Curator")}</span>
            </p>
          </div>
          {founderQuote && <QuoteBlock quote={founderQuote} className="lg:py-0" />}
        </div>
      </section>

      <section className="max-w-container-max mx-auto px-gutter-page py-20 grid gap-10 md:grid-cols-[1fr_1.4fr]">
        <h2 className="font-display text-3xl md:text-4xl">{t("Building the platform together")}</h2>
        <p className="max-w-2xl text-lg leading-[1.6] text-on-surface">
          {t("Anané brings her curatorial eye and her experience of creating spaces for artists through Nulu Music. Nilton Viana, Africa Liaison and Partner, builds relationships with artists and helps spearhead the technology behind the platform. Their collaboration connects discovery on the ground with a continuing digital home for the work.")}
        </p>
      </section>

      <section className="bg-[var(--nua-charcoal-deep)] text-[var(--nua-white)]">
        <div className="max-w-container-max mx-auto px-gutter-page py-20 grid gap-10 md:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[var(--nua-grey-light)]">{t("Our mission")}</p>
            <h2 translate="no" className="mt-3 font-display text-3xl md:text-4xl">
              Illuminating Unseen Voices
            </h2>
          </div>
          <div className="max-w-2xl space-y-5 text-lg leading-[1.6] text-[var(--nua-white)]/90">
            <p>
              {t("We create opportunities for unseen and underrepresented African artists to be discovered, valued and supported. Through artwork, the stories artists choose to tell and music from the countries represented, we invite people into a closer encounter with individual creative worlds.")}
            </p>
            <p>
              {t("Our long-term vision reaches across all 54 African countries, honoring the different cultures, histories and perspectives each artist brings.")}
            </p>
            <dl className="grid grid-cols-3 gap-6 border-t border-[var(--nua-line-dark)] pt-8">
              {[
                { value: String(artists), label: "Artists" },
                { value: String(countries), label: "Countries represented" },
                { value: "2026", label: "Founded" },
              ].map((s) => (
                <div key={s.label}>
                  <dd className="font-display text-3xl">{s.value}</dd>
                  <dt className="mt-1 text-xs uppercase tracking-widest text-[var(--nua-grey-light)]">{t(s.label)}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="max-w-container-max mx-auto px-gutter-page py-20 text-center">
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link href="/artists" className="btn-primary inline-flex min-h-[48px] items-center justify-center px-8 text-base font-semibold">
            {t("Meet the artists")}
          </Link>
          <Link href="/collections" className="btn-secondary inline-flex min-h-[48px] items-center justify-center px-8 text-base">
            {t("Explore the collection")}
          </Link>
        </div>
      </section>
    </main>
  );
}
