import Image from "next/image";
import type { SiteHero } from "@/lib/data/site-heroes";

/**
 * Fills its (relative) parent with a site hero: the 4:5 mobile image on
 * phones when there is one, otherwise the desktop image cropped around its
 * focal point.
 */
export function HeroPicture({ hero, className = "" }: { hero: SiteHero; className?: string }) {
  return (
    <>
      <Image
        src={hero.imageDesktop}
        alt={hero.alt}
        fill
        priority
        sizes="100vw"
        className={`object-cover ${hero.imageMobile ? "hidden md:block" : ""} ${className}`}
        style={{ objectPosition: hero.focalPoint }}
      />
      {hero.imageMobile && (
        <Image
          src={hero.imageMobile}
          alt={hero.alt}
          fill
          priority
          sizes="100vw"
          className={`object-cover md:hidden ${className}`}
        />
      )}
    </>
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
