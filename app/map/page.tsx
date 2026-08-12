import type { Metadata } from "next";
import Link from "next/link";
import { ClayAtlasMap } from "@/components/map/ClayAtlasMap";
import { COUNTRY_COUNT } from "@/lib/data/artists";

export const metadata: Metadata = {
  title: "Interactive Map | NU-ART",
  description: "Explore contemporary African art country by country on an interactive map of the continent.",
};

export default function MapPage() {
  return (
    <main className="nu-atlas nu-atlas-page max-w-container-max mx-auto px-gutter-page py-16 md:py-24">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="font-label-caps text-label-caps text-[color:var(--atlas-accent)] uppercase block mb-2">
            The Discovery Map
          </span>
          <h1 className="font-display-lg text-display-lg text-[color:var(--atlas-fg)]">The Atlas, in Full.</h1>
          <p className="text-[color:var(--atlas-fg-muted)] mt-3 max-w-xl">
            Hover a country to see its name, click to open its full spotlight page. {COUNTRY_COUNT} nations,
            filterable by medium.
          </p>
        </div>
        <Link
          href="/"
          className="font-navigation text-navigation uppercase tracking-widest text-[color:var(--atlas-fg-muted)] hover:text-[color:var(--atlas-accent)] shrink-0"
        >
          ← Back to Home
        </Link>
      </header>

      <ClayAtlasMap />
    </main>
  );
}
