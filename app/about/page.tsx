import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ARTIST_COUNT, COUNTRY_COUNT } from "@/lib/data/artists";

export const metadata: Metadata = {
  title: "About Us | NU-ART",
  description: "The mission, vision, and impact behind NU-ART Collective.",
};

const A = "https://nu-artcollective.lovable.app/__l5e/assets-v1";

export default function AboutPage() {
  return (
    <main>
      <section className="max-w-container-max mx-auto px-gutter-page pt-16 pb-24 md:pt-24">
        <span className="font-label-caps text-label-caps text-secondary uppercase block mb-4">Our Mission</span>
        <h1 className="font-display-lg text-display-lg max-w-2xl mb-8">
          Every country, a voice. <br />
          <span className="italic">Every artist, a legacy.</span>
        </h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl leading-relaxed">
          NU-ART Collective exists to close the distance between contemporary African artists and the collectors,
          curators, and institutions who should already know their work. We built a curated, country-by-country
          platform — not an algorithmic marketplace — because discovery should feel like travel, not scrolling.
        </p>
      </section>

      <section className="max-w-container-max mx-auto px-gutter-page pb-24 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div className="relative aspect-[4/5] overflow-hidden">
          <Image
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            alt="A curator in a sunlit gallery space examining a contemporary African painting up close."
            src={`${A}/8170e7d1-3e87-4dfd-984d-5c50a5625187/afr-gallery-room.jpg`}
          />
        </div>
        <div>
          <span className="font-label-caps text-label-caps text-secondary uppercase block mb-4">The Vision</span>
          <h2 className="font-headline-md text-headline-md mb-6">Sustainable, direct, artist-first.</h2>
          <p className="text-on-surface-variant leading-relaxed mb-6">
            Every acquisition made through NU-ART pays the artist directly — no galleries taking 50%+ margins, no
            middlemen deciding whose story gets told. Our curators travel to {COUNTRY_COUNT} countries to find
            work before it's discovered by anyone else, then build the infrastructure — authentication, shipping,
            provenance — collectors need to trust it.
          </p>
          <p className="text-on-surface-variant leading-relaxed">
            Today the Circle represents {ARTIST_COUNT}+ artists. Every one of them was found, not submitted.
          </p>
        </div>
      </section>

      <section className="bg-primary text-on-primary py-24">
        <div className="max-w-container-max mx-auto px-gutter-page grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
          {[
            { value: `${ARTIST_COUNT}+`, label: "Artists Discovered" },
            { value: `${COUNTRY_COUNT}`, label: "Nations Represented" },
            { value: "2024", label: "Founded" },
            { value: "100%", label: "Paid Direct to Artist" },
          ].map((s) => (
            <div key={s.label}>
              <p className="font-display text-3xl md:text-4xl mb-2">{s.value}</p>
              <p className="font-label-caps text-[10px] uppercase tracking-widest opacity-70">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-container-max mx-auto px-gutter-page py-24 text-center">
        <h2 className="font-headline-md text-headline-md mb-6">Join the Circle.</h2>
        <p className="text-on-surface-variant max-w-xl mx-auto mb-10">
          Whether you're collecting your first piece or your fiftieth, every acquisition through NU-ART directly
          supports an artist's practice and a nation's cultural visibility.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/artists"
            className="bg-primary text-on-primary px-8 py-4 font-navigation text-navigation uppercase tracking-widest hover:bg-secondary transition-colors"
          >
            Explore Artists
          </Link>
          <Link
            href="/faq"
            className="border border-primary/20 px-8 py-4 font-navigation text-navigation uppercase tracking-widest hover:border-secondary hover:text-secondary transition-colors"
          >
            Read the FAQ
          </Link>
        </div>
      </section>
    </main>
  );
}
