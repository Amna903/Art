"use client";

import Link from "@/components/i18n/Link";
import { useLanguage } from "@/lib/i18n";

/**
 * Homepage opening and "The beginning" (website copy and editorial
 * direction, 9 Oct 2026). "UNSEEN, UNHEARD" is the hero title; the second
 * tagline sits here. Both stay in English in every language.
 */
export function HomeIntro() {
  const { t } = useLanguage();
  return (
    <>
      <section className="px-gutter-page py-section-gap">
        <div className="mx-auto max-w-3xl text-center">
          {/* The hero already carries "UNSEEN. UNHEARD.", so only the second
              tagline appears here, small, to avoid repeating the title. */}
          <span aria-hidden="true" className="mx-auto mb-5 block h-[2px] w-12 bg-[var(--nua-red)]" />
          <p translate="no" className="text-sm uppercase tracking-[0.3em] text-on-surface-variant">
            Illuminating Unseen Voices
          </p>
          <p className="mt-8 font-display text-[clamp(1.35rem,2.2vw,1.75rem)] leading-[1.45] text-on-surface">
            {t("Sometimes a work of art stops you before you know why. A gaze. A gesture. The grain of sand holding a shape. Something reaches you, and you want to look closer.")}
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-[1.6] text-on-surface-variant">
            {t("NUA-ARTE invites you into that discovery: contemporary African art, the people who create it, and the stories they choose to share.")}
          </p>
          <Link
            href="/collections"
            className="mt-8 inline-block border-b border-[var(--nua-charcoal)] pb-1 text-base hover:border-[var(--nua-red)] hover:text-[var(--nua-red)]"
          >
            {t("Explore the collection")}
          </Link>
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
