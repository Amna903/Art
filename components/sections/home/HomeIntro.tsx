"use client";

import Link from "@/components/i18n/Link";
import { useLanguage } from "@/lib/i18n";

/**
 * Homepage opening and "The beginning" (website copy and editorial
 * direction, 9 Oct 2026). Both taglines appear here; their wording is kept in
 * English in every language.
 */
export function HomeIntro() {
  const { t } = useLanguage();
  return (
    <>
      <section className="px-gutter-page py-section-gap">
        <div className="mx-auto max-w-3xl text-center">
          <p translate="no" className="font-display text-[clamp(2rem,4.5vw,3.5rem)] uppercase leading-[1.05] text-[var(--nua-red-poster)]">
            UNSEEN, UNHEARD
          </p>
          <p translate="no" className="mt-3 text-sm uppercase tracking-[0.3em] text-on-surface-variant">
            Illuminating Unseen Voices
          </p>
          <p className="mt-10 font-display text-[clamp(1.35rem,2.2vw,1.75rem)] leading-[1.45] text-on-surface">
            {t("Sometimes a work of art stops you before you know why. A gaze. A gesture. The grain of sand holding a shape. Something reaches you, and you want to look closer.")}
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-[1.6] text-on-surface-variant">
            {t("NUA-ARTE invites you into that discovery: contemporary African art, the people who create it, and the stories they choose to share.")}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/collections" className="btn-primary inline-flex min-h-[48px] items-center px-8 text-base font-semibold">
              {t("Explore the collection")}
            </Link>
            <Link href="/artists" className="btn-secondary inline-flex min-h-[48px] items-center px-8 text-base">
              {t("Meet the artists")}
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[var(--nua-paper)] px-gutter-page py-section-gap">
        <div className="mx-auto grid max-w-container-max gap-10 md:grid-cols-[1fr_1.4fr] md:items-start">
          <h2 className="font-display text-[clamp(2rem,3.5vw,3rem)] leading-[1.1]">{t("The beginning")}</h2>
          <div className="max-w-2xl space-y-5 text-lg leading-[1.6] text-on-surface">
            <p>
              {t("It began with a visit to an art market in Luanda and twenty works chosen for a home. As the people behind those paintings came into view, a personal collection became the beginning of something larger.")}
            </p>
            <p>
              {t("Founded by Anané Vega in collaboration with Nilton Viana, NUA-ARTE creates space for unseen and underrepresented African artists to reach new audiences.")}
            </p>
            <Link href="/about" className="inline-block border-b border-[var(--nua-charcoal)] pb-1 text-base hover:border-[var(--nua-red)] hover:text-[var(--nua-red)]">
              {t("Discover our story")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
