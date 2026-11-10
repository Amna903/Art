import Image, { getImageProps } from "next/image";
import type { CSSProperties } from "react";
import type { SiteHero } from "@/lib/data/site-heroes";

/**
 * Fills its (relative) parent with a site hero: the 4:5 mobile image on
 * phones when there is one, otherwise the desktop image cropped around its
 * focal point.
 *
 * With a mobile image this is one <picture> (art direction), so a phone
 * downloads only the mobile file and a desktop only the desktop file —
 * previously both were preloaded everywhere. `fetchPriority="high"` makes it
 * the first image the browser fetches.
 */
export function HeroPicture({ hero, className = "" }: { hero: SiteHero; className?: string }) {
  if (!hero.imageMobile) {
    return (
      <Image
        src={hero.imageDesktop}
        alt={hero.alt}
        fill
        preload
        fetchPriority="high"
        loading="eager"
        quality={70}
        sizes="100vw"
        className={`object-cover ${className}`}
        style={{ objectPosition: hero.focalPoint }}
      />
    );
  }

  const common = { alt: hero.alt, fill: true, sizes: "100vw", quality: 70 } as const;
  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({ ...common, src: hero.imageDesktop });
  const { props: mobile } = getImageProps({ ...common, src: hero.imageMobile, fetchPriority: "high", loading: "eager" });

  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={desktopSrcSet} sizes="100vw" />
      <img
        {...mobile}
        alt={hero.alt}
        // Focal point applies to the desktop crop only, as before.
        className={`object-cover md:[object-position:var(--hero-focal)] ${className}`}
        style={{ ...mobile.style, "--hero-focal": hero.focalPoint } as CSSProperties}
      />
    </picture>
  );
}

/** "Artwork: [title] — [artist]" in white at 80% opacity, bottom of the hero. */
export function HeroCredit({
  credit,
  label,
  className = "bottom-3 right-4",
}: {
  credit: string | null;
  label: string;
  /** Position classes; bottom right by default. */
  className?: string;
}) {
  if (!credit) return null;
  return (
    <p className={`absolute z-10 max-w-[80%] truncate text-xs text-[var(--nua-white)]/80 ${className}`}>
      {label}
    </p>
  );
}
