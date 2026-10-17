"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "@/components/i18n/Link";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { blockImage, blockText, type PageBlocks } from "@/lib/data/pageBlocks";
import { HeroEditor, HERO_DEFAULTS, type HeroContent } from "./HeroEditor";

/** Reads the hero's page blocks, falling back to the built-in defaults. */
function readHero(blocks: PageBlocks): HeroContent {
  const image = blockImage(blocks, "hero_v2_image", {
    src: HERO_DEFAULTS.imageSrc,
    alt: HERO_DEFAULTS.imageAlt,
  });
  const text = (key: keyof HeroContent) =>
    blockText(blocks, `hero_v2_${key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)}`, HERO_DEFAULTS[key]);
  return {
    eyebrow: text("eyebrow"),
    titleLine1: text("titleLine1"),
    titleLine2: text("titleLine2"),
    titleColor: text("titleColor") === "red" ? "red" : "white",
    subLine1: text("subLine1"),
    subLine2: text("subLine2"),
    ctaLabel: text("ctaLabel"),
    ctaHref: text("ctaHref"),
    imageSrc: image.src,
    imageAlt: image.alt,
  };
}

/**
 * Homepage hero: "UNSEEN. UNHEARD." over a full-bleed portrait on charcoal.
 * Every piece (eyebrow, title, subtitle, button, link, image, alt text, title
 * colour) is editable by admins through HeroEditor. Text edited on a
 * translated page is saved for that language only; the title always stays as
 * entered (it is English in every language).
 */
export function Hero({ blocks }: { blocks: PageBlocks }) {
  const { t } = useLanguage();
  const { role } = useAuth();
  const [editing, setEditing] = useState(false);
  const hero = readHero(blocks);

  return (
    <section className="relative isolate w-screen mx-[calc(50%-50vw)] mt-16 overflow-hidden bg-[var(--nua-charcoal-deep)] text-[var(--nua-white)]">
      <div className="relative min-h-[calc(100svh-4rem)] lg:min-h-[min(calc(100svh-4rem),920px)]">
        {/* Portrait: right side on desktop, full background on mobile. */}
        <div className="absolute inset-0 lg:left-[38%]">
          <Image
            src={hero.imageSrc}
            alt={t(hero.imageAlt)}
            fill
            priority
            sizes="(max-width: 1023px) 100vw, 62vw"
            className="object-cover object-[60%_center]"
          />
        </div>
        {/* Charcoal fades so the text sits on a dark field, as in the poster. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden lg:block bg-gradient-to-r from-[var(--nua-charcoal-deep)] from-[38%] via-[var(--nua-charcoal-deep)]/70 via-[48%] to-transparent to-[62%]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 lg:hidden bg-gradient-to-t from-[var(--nua-charcoal-deep)] from-[30%] via-[var(--nua-charcoal-deep)]/75 via-[55%] to-[var(--nua-charcoal-deep)]/20"
        />

        <div className="relative z-10 mx-auto flex min-h-[inherit] w-full max-w-container-max flex-col px-6 pb-14 pt-8 sm:px-10 lg:px-12 lg:pb-20 lg:pt-10">
          <p translate="no" className="font-display text-[15px] uppercase tracking-[0.32em] text-[var(--nua-white)]/90">
            {hero.eyebrow}
          </p>

          <div className="mt-auto max-w-[760px] lg:my-auto">
            <h1
              translate="no"
              className={`font-display font-normal uppercase leading-[0.92] tracking-[0.01em] text-[clamp(3.5rem,11vw,9.5rem)] ${
                hero.titleColor === "red" ? "text-[var(--nua-red-poster)]" : "text-[var(--nua-white)]"
              }`}
            >
              <span className="block">{hero.titleLine1}</span>
              <span className="block">{hero.titleLine2}</span>
            </h1>

            <p className="mt-7 font-display text-[clamp(1.35rem,2.1vw,1.9rem)] leading-[1.3] text-[var(--nua-white)]/95">
              <span className="block">{t(hero.subLine1)}</span>
              <span className="block">{t(hero.subLine2)}</span>
            </p>

            <Link
              href={hero.ctaHref || "/artists"}
              className="mt-10 inline-flex items-center justify-center border border-[var(--nua-white)]/85 px-10 py-3.5 font-display text-[clamp(1.05rem,1.4vw,1.25rem)] text-[var(--nua-white)] transition-colors hover:bg-[var(--nua-white)] hover:text-[var(--nua-charcoal)]"
            >
              {t(hero.ctaLabel)}
            </Link>
          </div>
        </div>

        {role === "admin" && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="absolute right-4 top-4 z-20 flex items-center gap-2 bg-[var(--nua-white)] px-4 py-2 text-xs uppercase tracking-widest text-[var(--nua-charcoal)] shadow-lg hover:bg-[var(--nua-paper)]"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              edit
            </span>
            {t("Edit hero")}
          </button>
        )}
      </div>

      {editing && <HeroEditor initial={hero} onClose={() => setEditing(false)} />}
    </section>
  );
}
