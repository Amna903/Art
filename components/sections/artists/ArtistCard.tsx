"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "@/components/i18n/Link";
import type { Artist } from "@/lib/data/artists";
import { getCountryBySlug, getCountryDisplayName } from "@/lib/data/africa";
import { useLanguage } from "@/lib/i18n";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => w && w[0] === w[0].toUpperCase())
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

/**
 * Square artist card (change brief §8): ~240 px on desktop, ~160 px on
 * phones, served through next/image at card size instead of the full-size
 * original. A missing or broken photo shows the artist's initials on
 * --nua-paper, never an empty box.
 */
export function ArtistCard({ artist, index }: { artist: Artist; index: number }) {
  const { t, language } = useLanguage();
  const [broken, setBroken] = useState(false);
  const country = getCountryBySlug(artist.countrySlug)
    ? getCountryDisplayName(artist.countrySlug, language)
    : artist.countryName;
  const place = [artist.city, country].filter(Boolean).join(", ");
  const meta = [artist.age ? t("Age {age}", { age: artist.age }) : "", place].filter(Boolean).join(" · ");
  const showPhoto = !!artist.image && !broken;

  return (
    <Link href={`/artists/${artist.slug}`} className="group flex flex-col">
      <div className="relative mb-3 aspect-square overflow-hidden bg-[var(--nua-paper)]">
        {showPhoto ? (
          <Image
            src={artist.image}
            alt={artist.name}
            fill
            sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 300px"
            loading={index < 4 ? "eager" : "lazy"}
            className="object-cover object-[50%_30%] transition-transform duration-500 group-hover:scale-[1.03]"
            onError={() => setBroken(true)}
          />
        ) : (
          <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center font-display text-5xl text-[var(--nua-grey)]">
            {initials(artist.name)}
          </span>
        )}
      </div>
      <h3 className="font-headline-sm text-lg leading-snug text-primary group-hover:underline">{artist.name}</h3>
      {meta && <p className="text-sm text-on-surface-variant">{meta}</p>}
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="font-label-caps text-xs uppercase tracking-wider text-on-surface-variant">{t(artist.technique)}</p>
        {artist.newDiscovery ? (
          <span className="whitespace-nowrap text-[10px] font-bold text-secondary">{t("NEW DISCOVERY")}</span>
        ) : artist.worksCount > 0 ? (
          <span className="whitespace-nowrap text-[10px] font-bold text-on-surface-variant">
            {t("{count} WORKS", { count: artist.worksCount })}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
