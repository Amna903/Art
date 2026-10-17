import type { SiteHero } from "@/lib/data/site-heroes";
import { HeroCredit, HeroPicture } from "@/components/sections/HeroPicture";

/** Full-bleed image band for pages whose hero image is set in
 * Dashboard → Hero images. Renders nothing when the page has none. */
export function SiteHeroBand({ hero, creditLabel }: { hero: SiteHero | null; creditLabel: string }) {
  if (!hero) return null;
  return (
    <section className="relative isolate w-screen mx-[calc(50%-50vw)] mt-16 h-[min(56vw,62svh)] min-h-[320px] overflow-hidden bg-[var(--nua-charcoal-deep)]">
      <HeroPicture hero={hero} />
      {hero.credit && (
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--overlay-scrim)] to-transparent" aria-hidden="true" />
      )}
      <HeroCredit credit={hero.credit} label={creditLabel} />
    </section>
  );
}
