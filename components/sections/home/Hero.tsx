"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "@/components/i18n/Link";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { blockImage, blockText, type PageBlocks } from "@/lib/data/pageBlocks";
import type { SiteHero } from "@/lib/data/site-heroes";
import { HeroCredit, HeroPicture } from "@/components/sections/HeroPicture";
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
 * Homepage hero: "UNSEEN. UNHEARD." beside a portrait, on white in light mode
 * and charcoal in dark mode. Every piece (title, subtitle, button, link, image, alt text, title
 * colour) is editable by admins through HeroEditor. Text edited on a
 * translated page is saved for that language only; the title always stays as
 * entered (it is English in every language).
 */
export function Hero({ blocks, siteHero }: { blocks: PageBlocks; siteHero: SiteHero | null }) {
  const { t } = useLanguage();
  const { role } = useAuth();
  const [editing, setEditing] = useState(false);
  const hero = readHero(blocks);

  return (
    <section className="relative isolate w-screen mx-[calc(50%-50vw)] mt-16 overflow-hidden bg-[var(--nua-white)] text-[var(--nua-charcoal)] dark:bg-[var(--nua-charcoal-deep)] dark:text-[var(--nua-white)]">
      <div className="relative min-h-[min(calc(100svh-4rem),640px)] lg:min-h-[min(calc(100svh-4rem),720px)]">
        {/* Portrait: right side on desktop, full background on mobile. */}
        <div className="absolute inset-0 lg:left-[42%]">
          {siteHero ? (
            <HeroPicture hero={siteHero} />
          ) : (
            <Image
              src={hero.imageSrc}
              alt={t(hero.imageAlt)}
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 58vw"
              className="object-cover object-[60%_center]"
            />
          )}
        </div>
        {/* Fades so the text sits on a plain field: white in light mode, charcoal in dark. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden lg:block bg-gradient-to-r from-[var(--nua-white)] from-[42%] via-[var(--nua-white)]/70 via-[50%] to-transparent to-[62%] dark:from-[var(--nua-charcoal-deep)] dark:via-[var(--nua-charcoal-deep)]/70"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 lg:hidden bg-gradient-to-t from-[var(--nua-white)] from-[30%] via-[var(--nua-white)]/75 via-[55%] to-[var(--nua-white)]/20 dark:from-[var(--nua-charcoal-deep)] dark:via-[var(--nua-charcoal-deep)]/75 dark:to-[var(--nua-charcoal-deep)]/20"
        />

        <div className="relative z-10 mx-auto flex min-h-[inherit] w-full max-w-container-max flex-col justify-end px-6 pb-12 pt-10 sm:px-10 lg:justify-center lg:px-12 lg:py-16">
          <div className="max-w-[560px]">
            <h1
              translate="no"
              className={`font-display font-normal uppercase leading-[0.95] tracking-[0.01em] text-[clamp(2.5rem,6vw,5.25rem)] ${
                hero.titleColor === "red"
                  ? "text-[var(--nua-red-poster)]"
                  : "text-[var(--nua-charcoal)] dark:text-[var(--nua-white)]"
              }`}
            >
              <span className="block">{hero.titleLine1}</span>
              <span className="block">{hero.titleLine2}</span>
            </h1>

            <p className="mt-5 font-display text-[clamp(1.05rem,1.5vw,1.3rem)] leading-[1.4] text-[var(--nua-charcoal)]/90 dark:text-[var(--nua-white)]/90">
              <span className="block">{t(hero.subLine1)}</span>
              <span className="block">{t(hero.subLine2)}</span>
            </p>

            <Link
              href={hero.ctaHref || "/artists"}
              className="mt-7 inline-flex items-center justify-center border border-[var(--nua-charcoal)] px-6 py-2.5 font-display text-base text-[var(--nua-charcoal)] transition-colors hover:bg-[var(--nua-charcoal)] hover:text-[var(--nua-white)] dark:border-[var(--nua-white)]/85 dark:text-[var(--nua-white)] dark:hover:bg-[var(--nua-white)] dark:hover:text-[var(--nua-charcoal)]"
            >
              {t(hero.ctaLabel)}
            </Link>
          </div>
        </div>

        {siteHero?.credit && (
          <HeroCredit
            credit={siteHero.credit}
            label={t("Artwork: {credit}", { credit: siteHero.credit })}
            className="right-4 top-3 lg:bottom-3 lg:top-auto"
          />
        )}

        {role === "admin" && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="absolute right-4 top-4 z-20 flex items-center gap-2 bg-[var(--nua-white)] px-4 py-2 text-xs uppercase tracking-widest text-[var(--nua-charcoal)] shadow-lg ring-1 ring-[var(--nua-line)] hover:bg-[var(--nua-paper)]"
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
