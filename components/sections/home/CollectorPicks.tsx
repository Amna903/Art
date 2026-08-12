"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getArtistSlugByName } from "@/lib/data/artists";
import { EnquiryModal } from "@/components/enquiry/EnquiryModal";

export type CollectorPick = {
  slug: string;
  title: string;
  artist: string;
  collection: string;
  image: string;
};

type CollectorPicksProps = {
  picks: CollectorPick[];
};

export function CollectorPicks({ picks }: CollectorPicksProps) {
  const [active, setActive] = useState<CollectorPick | null>(null);

  return (
    <section className="py-section-gap px-gutter-page">
      <div className="max-w-container-max mx-auto">
        <div className="text-center mb-20">
          <h2 className="font-headline-md text-headline-md mb-4">Collector Picks</h2>
          <p className="font-body-md text-on-surface-variant max-w-xl mx-auto">
            The most sought-after acquisitions from our global circle of discerning collectors.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
          {picks.map((pick) => (
            <div key={pick.slug} className="group flex flex-col">
              <div
                onClick={() => setActive(pick)}
                className="relative mb-6 overflow-hidden aspect-square cursor-pointer bg-surface-container"
              >
                <Image
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  alt={pick.title}
                  src={pick.image}
                />
                {/* Subtle hover pill badge at bottom right instead of heavy full-image cover */}
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <span className="bg-primary text-on-primary text-[10px] font-navigation uppercase tracking-widest px-4 py-2 shadow-lg">
                    Request Price
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="font-label-caps text-[10px] text-secondary mb-1">{pick.collection}</p>
                  <h4
                    onClick={() => setActive(pick)}
                    className="font-headline-sm text-headline-sm cursor-pointer hover:text-secondary transition-colors"
                  >
                    {pick.title}
                  </h4>
                  <Link
                    href={`/artists/${getArtistSlugByName(pick.artist)}`}
                    className="font-body-md text-on-surface-variant italic hover:text-secondary hover:underline transition-colors block mt-0.5"
                  >
                    {pick.artist}
                  </Link>
                </div>
                <div className="text-right shrink-0">
                  <button
                    onClick={() => setActive(pick)}
                    className="font-navigation text-[11px] uppercase tracking-widest text-secondary hover:text-primary border-b border-secondary/30 hover:border-primary transition-all pb-0.5"
                  >
                    Request Price
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <EnquiryModal
        open={!!active}
        onClose={() => setActive(null)}
        artworkSlug={active?.slug ?? ""}
        artworkTitle={active?.title ?? ""}
        artistName={active?.artist}
        artworkImage={active?.image}
      />
    </section>
  );
}
