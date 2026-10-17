"use client";

import Link from "@/components/i18n/Link";
import { fixtureBio, type Artist } from "@/lib/data/artists";
import { getCountryBySlug } from "@/lib/data/africa";
import { useLanguage } from "@/lib/i18n";

export function ArtistCard({ artist, offset }: { artist: Artist; offset: boolean }) {
  const { t } = useLanguage();
  const fixtureCountry = artist.fixture && getCountryBySlug(artist.fixture.countrySlug);
  const bio = artist.fixture && fixtureCountry ? fixtureBio(artist.fixture.first, fixtureCountry, t) : artist.bio;

  return (
    <Link
      href={`/artists/${artist.slug}`}
      className={["artist-card-container group flex flex-col relative", offset ? "lg:translate-y-10" : ""].join(" ")}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-surface-container-low mb-6 cursor-pointer">
        <div
          className="absolute inset-0 z-10 transition-opacity duration-700 group-hover:opacity-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${artist.image}')` }}
        />
        <div className="absolute inset-0 z-0 bg-surface-container flex flex-col justify-end p-7">
          <div className="mb-4">
            <span className="font-label-caps text-secondary">{t("FEATURED WORK")}</span>
            <h4 className="font-headline-sm text-primary">“{artist.featuredWork}”</h4>
          </div>
          <p className="font-body-md text-on-surface-variant line-clamp-4 italic">{bio}</p>
          <div className="mt-6 flex justify-between items-center">
            <span className="font-label-caps uppercase tracking-widest border-b border-primary">{t("View Bio")}</span>
            <span className="material-symbols-outlined">north_east</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-start gap-3">
          <h3 className="font-headline-sm text-primary">{artist.name}</h3>
          <span className="font-label-caps text-on-surface-variant text-right">
            {artist.city}, {artist.countryCode.slice(0, 2)}
          </span>
        </div>
        <div className="red-thread mb-2" />
        <div className="flex justify-between items-center gap-3">
          <p className="font-label-caps text-on-surface-variant tracking-wider uppercase">{t(artist.technique)}</p>
          <span className="text-[10px] font-bold bg-secondary-container/10 text-secondary px-2 py-0.5 rounded-full whitespace-nowrap">
            {artist.newDiscovery ? t("NEW DISCOVERY") : t("{count} WORKS", { count: artist.worksCount })}
          </span>
        </div>
      </div>
    </Link>
  );
}
