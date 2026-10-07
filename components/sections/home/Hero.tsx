"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { EditableText } from "@/components/editing/EditableText";
import { EditableImage } from "@/components/editing/EditableImage";
import { blockText, blockImage, type PageBlocks } from "@/lib/data/pageBlocks";

const HERO_IMAGE = "/images/hero-portrait.jpg";

export function Hero({ blocks }: { blocks: PageBlocks }) {
  const { t } = useLanguage();
  const image = blockImage(blocks, "hero_portrait", {
    src: HERO_IMAGE,
    alt: "Artist in a contemporary studio",
  });

  return (
    <section className="relative isolate w-screen mx-[calc(50%-50vw)] overflow-hidden bg-background text-on-background">
      <div className="relative mt-20 h-[38vh] min-h-[280px] max-h-[420px] w-full shrink-0 lg:absolute lg:inset-0 lg:right-0 lg:-inset-y-[10%] lg:left-auto lg:mt-0 lg:h-auto lg:max-h-none lg:w-[55%]">
        <EditableImage
          page="home"
          blockKey="hero_portrait"
          bucket="home"
          src={image.src}
          alt={image.alt}
          fit="cover"
          className="hero-portrait-img h-full w-full"
        />
      </div>
      <div
        aria-hidden="true"
        className="hero-fade-left pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-background from-[34%] via-background/35 via-[59%] to-transparent to-[78%] lg:block"
      />
      <div
        aria-hidden="true"
        className="hero-fade-corner pointer-events-none absolute inset-0 hidden lg:block"
      />
      <div
        aria-hidden="true"
        className="hero-fade-bottom pointer-events-none absolute inset-x-0 top-20 h-[38vh] min-h-[280px] max-h-[420px] bg-gradient-to-b from-transparent via-background/15 to-background/30 lg:hidden"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-container-max items-start px-4 pb-12 pt-10 -translate-x-4 sm:px-6 sm:pb-14 sm:pt-12 sm:-translate-x-6 lg:-translate-x-12 lg:min-h-[min(900px,68vw)] lg:items-center lg:py-24 lg:px-8">
        <div className="w-full max-w-[760px] lg:w-[58%]">
          <div className="mb-5 flex items-center gap-3">
            <span aria-hidden="true" className="h-px w-5 bg-secondary" />
            <EditableText
              page="home"
              blockKey="hero_eyebrow"
              value={blockText(blocks, "hero_eyebrow", "ESTABLISHED 2024")}
              as="span"
              className="font-label-caps text-[9px] tracking-[0.28em] uppercase text-secondary"
              multiline={false}
            />
          </div>

          <h1 className="mb-6 font-display text-[clamp(2.25rem,8vw,3.5rem)] font-medium leading-[0.94] tracking-[-0.025em] text-on-background md:text-[clamp(2.75rem,5vw,5rem)] lg:text-[clamp(3.5rem,7vw,6rem)]">
            <EditableText
              page="home"
              blockKey="hero_editorial_line1"
              value={blockText(blocks, "hero_editorial_line1", "Join the Circle of")}
              as="span"
              className="lg:whitespace-nowrap"
              multiline={false}
            />
            <span className="block italic font-medium">
              <EditableText
                page="home"
                blockKey="hero_editorial_line2"
                value={blockText(blocks, "hero_editorial_line2", "African Art")}
                as="span"
                multiline={false}
              />
            </span>
            <span className="block italic font-medium">
              <span className="relative inline-block">
                <EditableText
                  page="home"
                  blockKey="hero_editorial_line3"
                  value={blockText(blocks, "hero_editorial_line3", "Discovery.")}
                  as="span"
                  multiline={false}
                />
                <svg
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-1 left-0 h-2 w-[88%] overflow-visible"
                  viewBox="0 0 140 8"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M1 5.5 C35 4.8 90 5.9 139 4.5"
                    fill="none"
                    stroke="#9F0D12"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </span>
          </h1>

          <EditableText
            page="home"
            blockKey="hero_subhead"
            value={blockText(
              blocks,
              "hero_subhead",
              "Discover unknown local artists across Africa, collect meaningful works and support cultural visibility. A movement dedicated to the unseen and the profound.",
            )}
            as="p"
            className="max-w-[440px] text-[15px] leading-[1.65] text-on-surface-variant"
          />

          <div className="relative mt-7 inline-block">
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -m-3 h-[calc(100%+1.5rem)] w-[calc(100%+1.5rem)]"
              viewBox="0 0 140 80"
              preserveAspectRatio="none"
            >
              <path
                d="M70,7 C92,7 116,16 124,36 C129,48 119,65 98,72 C80,77 52,76 36,68 C20,60 12,44 18,29 C24,14 47,5 70,7 Z"
                fill="none"
                stroke="#9F0D12"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.75"
              />
            </svg>
            <Link
              href="/artists"
              className="relative inline-flex min-w-[176px] items-center justify-center bg-primary px-9 py-4 text-[10px] font-label-caps tracking-[0.22em] uppercase text-on-primary transition-colors hover:bg-secondary hover:text-on-secondary"
            >
              {t("Explore artists")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
